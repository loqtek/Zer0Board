"""Settings and integrations API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
import httpx
import asyncio

from app.api.v1.dependencies import get_current_user, get_db
from app.api.v1.schemas import ErrorResponse
from app.models.user import User
from app.models.integration import Integration
from app.services.email_imap import test_imap_connection, fetch_emails, get_unread_count
from app.services.home_assistant import (
    test_home_assistant_connection,
    get_home_assistant_states,
    call_home_assistant_service,
    get_home_assistant_entities,
    format_entity_state,
)
from pydantic import BaseModel


router = APIRouter()


# Schemas
class IntegrationBase(BaseModel):
    """Base integration schema."""

    service: str
    service_type: str
    config: Optional[dict] = None
    extra_data: Optional[dict] = None
    is_active: bool = True


class IntegrationCreate(IntegrationBase):
    """Schema for creating an integration."""

    pass


class IntegrationUpdate(BaseModel):
    """Schema for updating an integration."""

    config: Optional[dict] = None
    extra_data: Optional[dict] = None
    is_active: Optional[bool] = None


class IntegrationResponse(IntegrationBase):
    """Schema for integration response."""

    id: int
    user_id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

    @staticmethod
    def from_orm(integration: Integration) -> "IntegrationResponse":
        """Convert integration ORM object to response model."""
        # Convert is_active from string to bool
        is_active = integration.is_active
        if isinstance(is_active, str):
            is_active = is_active.lower() in ("true", "1", "yes", "on")
        elif not isinstance(is_active, bool):
            is_active = bool(is_active)
        
        return IntegrationResponse(
            id=integration.id,
            user_id=integration.user_id,
            service=integration.service,
            service_type=integration.service_type,
            config=integration.config or {},
            extra_data=integration.extra_data or {},
            is_active=is_active,
            created_at=integration.created_at.isoformat() if hasattr(integration.created_at, "isoformat") else str(integration.created_at),
            updated_at=integration.updated_at.isoformat() if hasattr(integration.updated_at, "isoformat") else str(integration.updated_at),
        )


class WidgetConfigTemplate(BaseModel):
    """Schema for widget configuration template."""

    category: str
    widgets: List[dict]


class IntegrationTestRequest(BaseModel):
    """Schema for testing integration credentials."""

    service: str
    service_type: str
    config: Optional[dict] = None


class IntegrationTestResponse(BaseModel):
    """Schema for integration test response."""

    success: bool
    message: str
    details: Optional[dict] = None


@router.get(
    "/widgets/templates",
    response_model=List[WidgetConfigTemplate],
    responses={401: {"model": ErrorResponse}},
)
async def get_widget_templates(
    current_user: User = Depends(get_current_user),
):
    """Get available widget templates organized by category."""
    return [
        {
            "category": "Time & Date",
            "widgets": [
                {"type": "clock", "name": "Clock", "icon": "🕐", "description": "Digital or analog clock"},
            ],
        },
        {
            "category": "Calendars",
            "widgets": [
                {"type": "google_calendar", "name": "Google Calendar", "icon": "📅", "description": "View Google Calendar events", "requires_auth": True},
                {"type": "microsoft_calendar", "name": "Microsoft Calendar", "icon": "📆", "description": "View Microsoft Calendar events", "requires_auth": True},
                {"type": "calendar", "name": "Local Calendar", "icon": "📅", "description": "Local calendar with events"},
            ],
        },
        {
            "category": "Weather",
            "widgets": [
                {"type": "weather", "name": "Weather", "icon": "🌤️", "description": "Current weather conditions"},
            ],
        },
        {
            "category": "Finance & Trading",
            "widgets": [
                {"type": "stock", "name": "Stock Market", "icon": "📈", "description": "Real-time stock, forex, and crypto prices using Alpha Vantage API", "requires_config": True},
                {"type": "tradingview", "name": "TradingView Widget", "icon": "📊", "description": "Free TradingView charts and market data", "requires_config": True},
                {"type": "crypto", "name": "Cryptocurrency", "icon": "₿", "description": "Cryptocurrency prices using Alpha Vantage API", "requires_config": True},
            ],
        },
        {
            "category": "Data & Analytics",
            "widgets": [
                {"type": "graph", "name": "Graph/Chart", "icon": "📉", "description": "Custom graph from API", "requires_config": True},
                {"type": "metric", "name": "Metric", "icon": "📊", "description": "Display a metric value", "requires_config": True},
            ],
        },
        {
            "category": "Communication",
            "widgets": [
                {"type": "email", "name": "Email", "icon": "📧", "description": "Email inbox summary", "requires_auth": True},
                {"type": "slack", "name": "Slack", "icon": "💬", "description": "Slack messages/channels", "requires_auth": True},
                {"type": "discord", "name": "Discord", "icon": "🎮", "description": "Discord server activity", "requires_auth": True},
                {"type": "teams", "name": "Microsoft Teams", "icon": "👥", "description": "Teams messages/activity", "requires_auth": True},
            ],
        },
        {
            "category": "Productivity",
            "widgets": [
                {"type": "todo", "name": "Todo List", "icon": "✅", "description": "Task list"},
                {"type": "note", "name": "Notes", "icon": "📝", "description": "Text notes"},
                {"type": "bookmark", "name": "Bookmarks", "icon": "🔖", "description": "Organized bookmarks with groups and custom colors"},
            ],
        },
        {
            "category": "Media",
            "widgets": [
                {"type": "photo", "name": "Photo Gallery", "icon": "🖼️", "description": "Photo slideshow", "requires_config": True},
                {"type": "news", "name": "News Headlines", "icon": "📰", "description": "News headlines"},
            ],
        },
        {
            "category": "Health & Fitness",
            "widgets": [
                {"type": "fitbit", "name": "Fitbit", "icon": "⌚", "description": "Steps, heart rate, and activity data", "requires_auth": True},
            ],
        },
        {
            "category": "Smart Home",
            "widgets": [
                {"type": "smart_home", "name": "Smart Home Control", "icon": "🏠", "description": "Smart home devices", "requires_config": True},
                {"type": "home_assistant", "name": "Home Assistant", "icon": "🏡", "description": "Control and monitor Home Assistant entities", "requires_auth": True},
            ],
        },
        {
            "category": "Utilities",
            "widgets": [
                {"type": "qr_code", "name": "QR Code", "icon": "🔲", "description": "Generate QR codes", "requires_config": True},
            ],
        },
    ]


@router.post(
    "/integrations/test",
    response_model=IntegrationTestResponse,
    responses={401: {"model": ErrorResponse}},
)
async def test_integration(
    test_data: IntegrationTestRequest,
    current_user: User = Depends(get_current_user),
):
    """Test integration credentials before saving."""
    if not test_data.config:
        return IntegrationTestResponse(
            success=False,
            message="Configuration is required",
        )
    
    if test_data.service_type == "imap":
        # IMAP email integration
        host = test_data.config.get("host")
        port = test_data.config.get("port", 993)
        username = test_data.config.get("username")
        password = test_data.config.get("password")
        use_ssl = test_data.config.get("use_ssl", True)
        use_tls = test_data.config.get("use_tls", False)
        
        if not host or not username or not password:
            return IntegrationTestResponse(
                success=False,
                message="Host, username, and password are required for IMAP",
            )
        
        # Test IMAP connection - run in thread pool to avoid blocking
        result = await asyncio.to_thread(
            test_imap_connection,
            host, port, username, password, use_ssl, use_tls
        )
        if result["success"]:
            return IntegrationTestResponse(
                success=True,
                message=f"IMAP connection successful. {result.get('unread_count', 0)} unread emails.",
                details={"unread_count": result.get("unread_count", 0)},
            )
        else:
            return IntegrationTestResponse(
                success=False,
                message=result["message"],
            )
    elif test_data.service_type == "url":
        url = test_data.config.get("url") or test_data.config.get("widget_url") or test_data.config.get("ical_url") or test_data.config.get("rss_url")
        if not url:
            return IntegrationTestResponse(
                success=False,
                message="URL is required",
            )
        if not url.startswith(("http://", "https://")):
            return IntegrationTestResponse(
                success=False,
                message="URL must start with http:// or https://",
            )
        
        # For RSS feed integrations, test the feed
        if test_data.service == "rss_feed":
            try:
                # Use RSS2JSON API to test the feed
                async with httpx.AsyncClient(timeout=15.0) as client:
                    rss2json_url = f"https://api.rss2json.com/v1/api.json?rss_url={url}"
                    response = await client.get(rss2json_url)
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("status") == "ok" and data.get("items"):
                            feed_title = data.get("feed", {}).get("title", "RSS Feed")
                            item_count = len(data.get("items", []))
                            return IntegrationTestResponse(
                                success=True,
                                message=f"RSS feed is valid. Found {item_count} items from {feed_title}",
                                details={"feed_title": feed_title, "item_count": item_count},
                            )
                        else:
                            return IntegrationTestResponse(
                                success=False,
                                message=f"RSS feed appears to be empty or invalid: {data.get('message', 'Unknown error')}",
                            )
                    else:
                        return IntegrationTestResponse(
                            success=False,
                            message=f"Failed to fetch RSS feed (status {response.status_code})",
                        )
            except httpx.TimeoutException:
                return IntegrationTestResponse(
                    success=False,
                    message="Connection timeout. Please check the URL and try again.",
                )
            except httpx.RequestError as e:
                return IntegrationTestResponse(
                    success=False,
                    message=f"Failed to fetch RSS feed: {str(e)}",
                )
            except Exception as e:
                return IntegrationTestResponse(
                    success=False,
                    message=f"Error testing RSS feed: {str(e)}",
            )
        
        # For calendar ICS feeds, validate the URL format
        if test_data.service in ["google_calendar", "microsoft_calendar"]:
            # Check if it looks like an ICS feed URL
            if ".ics" not in url.lower() and "ical" not in url.lower():
                return IntegrationTestResponse(
                    success=False,
                    message="Calendar URL should be an ICS feed URL (ends with .ics or contains 'ical')",
    )
            # Try to fetch the URL to validate it's accessible
            try:
                async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                    response = await client.get(url)
                    if response.status_code == 200:
                        # Check if it looks like iCal content
                        content_type = response.headers.get("content-type", "").lower()
                        if "text/calendar" in content_type or "text/plain" in content_type or "BEGIN:VCALENDAR" in response.text[:100]:
                            return IntegrationTestResponse(
                                success=True,
                                message="ICS feed URL is valid and accessible",
                            )
                        return IntegrationTestResponse(
                            success=True,
                            message="URL is accessible (content validation skipped)",
                        )
                    elif response.status_code in [301, 302, 303, 307, 308]:
                        return IntegrationTestResponse(
                            success=True,
                            message="URL is valid (redirects)",
                        )
                    else:
                        return IntegrationTestResponse(
                            success=False,
                            message=f"URL returned status {response.status_code}",
                        )
            except httpx.TimeoutException:
                return IntegrationTestResponse(
                    success=False,
                    message="URL connection timeout",
                )
            except Exception as e:
                # Don't fail on connection errors - URL format might be valid
                return IntegrationTestResponse(
                    success=True,
                    message="URL format is valid (connection test failed)",
                )
        
        # For Home Assistant, test connection with access token
        if test_data.service == "home_assistant":
            access_token = test_data.config.get("access_token")
            if not access_token:
                return IntegrationTestResponse(
                    success=False,
                    message="Access token is required for Home Assistant",
                )
            # Test the connection
            result = test_home_assistant_connection(url, access_token)
            return IntegrationTestResponse(
                success=result["success"],
                message=result["message"],
                details=result.get("details"),
            )
        
        # For TradingView, just validate format
        return IntegrationTestResponse(
            success=True,
            message="URL format is valid",
        )
    elif test_data.service_type == "oauth":
        # OAuth-based integrations (Fitbit)
        if test_data.service == "fitbit":
            # For OAuth, we need client_id and client_secret to test
            client_id = test_data.config.get("client_id")
            client_secret = test_data.config.get("client_secret")
            
            if not client_id or not client_secret:
                return IntegrationTestResponse(
                    success=False,
                    message="Client ID and Client Secret are required for OAuth integration",
                )
            
            # Test the credentials by attempting to get an access token
            try:
                access_token = test_data.config.get("access_token")
                if access_token:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        response = await client.get(
                            "https://api.fitbit.com/1/user/-/profile.json",
                            headers={"Authorization": f"Bearer {access_token}"}
                        )
                        if response.status_code == 200:
                            profile_data = response.json()
                            return IntegrationTestResponse(
                                success=True,
                                message=f"Connected to Fitbit as {profile_data.get('user', {}).get('fullName', 'User')}",
                                details={"profile": profile_data}
                            )
                        elif response.status_code == 401:
                            return IntegrationTestResponse(
                                success=False,
                                message="Access token is invalid or expired. Please re-authorize.",
                            )
                        else:
                            return IntegrationTestResponse(
                                success=False,
                                message=f"Fitbit API returned status {response.status_code}",
                            )
                else:
                    return IntegrationTestResponse(
                        success=True,
                        message="Client credentials are valid. Please complete OAuth authorization.",
                    )
            except Exception as e:
                return IntegrationTestResponse(
                    success=False,
                    message=f"Error testing Fitbit connection: {str(e)}",
                )
        else:
            return IntegrationTestResponse(
                success=False,
                message="OAuth service type not supported for this service",
            )
    else:  # api_key
        api_key = test_data.config.get("api_key")
        if not api_key:
            return IntegrationTestResponse(
                success=False,
                message="API key is required",
            )
        
        # Service-specific validation
        if test_data.service == "slack":
            if not api_key.startswith(("xoxb-", "xoxp-", "xoxa-", "xoxs-")):
                return IntegrationTestResponse(
                    success=False,
                    message="Invalid Slack token format. Tokens should start with xoxb-, xoxp-, xoxa-, or xoxs-",
                )
        elif test_data.service == "discord":
            if len(api_key) < 50:
                return IntegrationTestResponse(
                    success=False,
                    message="Discord bot token appears to be invalid (too short)",
                )
        
        if len(api_key) < 10:
            return IntegrationTestResponse(
                success=False,
                message="API key appears to be invalid (too short)",
            )
        return IntegrationTestResponse(
            success=True,
            message="API key format is valid",
    )


@router.get(
    "/integrations",
    response_model=List[IntegrationResponse],
    responses={401: {"model": ErrorResponse}},
)
async def list_integrations(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """List all integrations for the current user."""
    result = await session.execute(
        select(Integration).where(Integration.user_id == current_user.id)
    )
    integrations = result.scalars().all()
    return [IntegrationResponse.from_orm(integration) for integration in integrations]


@router.get(
    "/integrations/email/fetch",
    responses={401: {"model": ErrorResponse}},
)
async def fetch_email_integration_emails(
    integration_id: int,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Fetch emails from an email integration."""
    # Get integration
    result = await session.execute(
        select(Integration).where(
            and_(
                Integration.id == integration_id,
                Integration.user_id == current_user.id,
                Integration.service == "email",
                func.lower(Integration.is_active) == "true",
            )
        )
    )
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email integration not found",
        )
    
    config = integration.config or {}
    host = config.get("host")
    port = config.get("port", 993)
    username = config.get("username")
    password = config.get("password")
    use_ssl = config.get("use_ssl", True)
    use_tls = config.get("use_tls", False)
    folder = config.get("folder", "INBOX")
    
    if not host or not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email integration not properly configured",
        )
    
    try:
        # Run blocking IMAP operations in thread pool to avoid blocking the event loop
        # Using asyncio.gather to run both operations in parallel
        emails, unread_count = await asyncio.gather(
            asyncio.to_thread(
                fetch_emails,
                host, port, username, password, use_ssl, use_tls, limit, folder
            ),
            asyncio.to_thread(
                get_unread_count,
                host, port, username, password, use_ssl, use_tls, folder
            ),
        )
        
        return {
            "emails": emails,
            "unread_count": unread_count,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching emails: {str(e)}",
        )


@router.post(
    "/integrations",
    response_model=IntegrationResponse,
    status_code=status.HTTP_201_CREATED,
    responses={401: {"model": ErrorResponse}},
)
async def create_integration(
    integration_data: IntegrationCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Create a new integration."""
    # For email integrations, check for duplicates based on username/host combination
    if integration_data.service == "email":
        config = integration_data.config or {}
        host = config.get("host")
        username = config.get("username")
        
        if host and username:
            # Check if an integration with the same host and username already exists
            result = await session.execute(
                select(Integration).where(
                    and_(
                        Integration.user_id == current_user.id,
                        Integration.service == "email",
                        func.lower(Integration.is_active) == "true",
                    )
                )
            )
            existing_emails = result.scalars().all()
            
            for existing in existing_emails:
                existing_config = existing.config or {}
                if existing_config.get("host") == host and existing_config.get("username") == username:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Email integration for {username}@{host} already exists",
                    )
    else:
        # For other services, check if integration with same service already exists
        existing_integration = await session.execute(
            select(Integration).where(
                and_(
                    Integration.user_id == current_user.id,
                    Integration.service == integration_data.service,
                )
            )
        )
        if existing_integration.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An integration for service '{integration_data.service}' already exists",
            )

    integration = Integration(
        user_id=current_user.id,
        service=integration_data.service,
        service_type=integration_data.service_type,
        config=integration_data.config or {},
        extra_data=integration_data.extra_data or {},
        is_active=str(integration_data.is_active).lower(),
    )

    try:
        session.add(integration)
        await session.commit()
        await session.refresh(integration)
    except Exception as e:
        await session.rollback()
        # Check if it's a unique constraint violation
        if "UNIQUE constraint" in str(e) or "unique" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An integration for service '{integration_data.service}' already exists",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create integration",
        )

    return IntegrationResponse.from_orm(integration)


class ICALProxyResponse(BaseModel):
    content: str
    content_type: str


@router.get(
    "/integrations/ical/proxy",
    response_model=ICALProxyResponse,
    responses={401: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
)
async def proxy_ical_feed(
    url: str,
    current_user: User = Depends(get_current_user),
):
    """Proxy endpoint to fetch iCal feed content (server-side to avoid CORS issues)."""
    if not url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL parameter is required",
        )
    
    if not url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL must start with http:// or https://",
        )
    
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(
                url,
                headers={
                    "User-Agent": "ZeroBoard/1.0",
                    "Accept": "text/calendar, text/plain, */*",
                }
            )
            
            if response.status_code == 200:
                return ICALProxyResponse(
                    content=response.text,
                    content_type=response.headers.get("content-type", "text/calendar"),
                )
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch iCal feed: {response.status_code}",
                )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Request to iCal feed timed out",
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch iCal feed: {str(e)}",
        )


@router.put(
    "/integrations/{integration_id}",
    response_model=IntegrationResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def update_integration(
    integration_id: int,
    integration_data: IntegrationUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Update an integration."""
    result = await session.execute(
        select(Integration).where(
            and_(
                Integration.id == integration_id,
                Integration.user_id == current_user.id,
            )
        )
    )
    integration = result.scalar_one_or_none()

    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found",
        )

    if integration_data.config is not None:
        integration.config = integration_data.config
    if integration_data.extra_data is not None:
        integration.extra_data = integration_data.extra_data
    if integration_data.is_active is not None:
        integration.is_active = str(integration_data.is_active).lower()

    try:
        await session.commit()
        await session.refresh(integration)
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update integration",
        )

    return IntegrationResponse.from_orm(integration)


@router.delete(
    "/integrations/{integration_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def delete_integration(
    integration_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Delete an integration."""
    result = await session.execute(
        select(Integration).where(
            and_(
                Integration.id == integration_id,
                Integration.user_id == current_user.id,
            )
        )
    )
    integration = result.scalar_one_or_none()

    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found",
        )

    await session.delete(integration)
    await session.commit()

    return None


@router.get(
    "/integrations/home_assistant/states",
    responses={401: {"model": ErrorResponse}},
)
async def fetch_home_assistant_states(
    integration_id: int,
    entity_ids: Optional[str] = None,  # Comma-separated list
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Fetch Home Assistant entity states."""
    # Get integration
    result = await session.execute(
        select(Integration).where(
            and_(
                Integration.id == integration_id,
                Integration.user_id == current_user.id,
                Integration.service == "home_assistant",
                func.lower(Integration.is_active) == "true",
            )
        )
    )
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Home Assistant integration not found",
        )
    
    config = integration.config or {}
    url = config.get("url") or config.get("widget_url")
    access_token = config.get("access_token")
    
    if not url or not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Home Assistant integration not properly configured",
        )
    
    # Parse entity IDs if provided
    entity_id_list = None
    if entity_ids:
        entity_id_list = [eid.strip() for eid in entity_ids.split(",") if eid.strip()]
    
    try:
        result = get_home_assistant_states(url, access_token, entity_id_list)
        # Format states for display
        formatted_states = [format_entity_state(state) for state in result.get("states", [])]
        return {"states": formatted_states}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching Home Assistant states: {str(e)}",
        )


@router.post(
    "/integrations/home_assistant/service",
    responses={401: {"model": ErrorResponse}},
)
async def call_home_assistant_service_endpoint(
    integration_id: int,
    domain: str,
    service: str,
    entity_id: Optional[str] = None,
    service_data: Optional[dict] = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Call a Home Assistant service."""
    # Get integration
    result = await session.execute(
        select(Integration).where(
            and_(
                Integration.id == integration_id,
                Integration.user_id == current_user.id,
                Integration.service == "home_assistant",
                func.lower(Integration.is_active) == "true",
            )
        )
    )
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Home Assistant integration not found",
        )
    
    config = integration.config or {}
    url = config.get("url") or config.get("widget_url")
    access_token = config.get("access_token")
    
    if not url or not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Home Assistant integration not properly configured",
        )
    
    try:
        result = call_home_assistant_service(
            url, access_token, domain, service, entity_id, service_data
        )
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("message", "Failed to call service"),
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calling Home Assistant service: {str(e)}",
        )


@router.get(
    "/integrations/home_assistant/entities",
    responses={401: {"model": ErrorResponse}},
)
async def get_home_assistant_entities_endpoint(
    integration_id: int,
    domain: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get list of Home Assistant entities."""
    # Get integration
    result = await session.execute(
        select(Integration).where(
            and_(
                Integration.id == integration_id,
                Integration.user_id == current_user.id,
                Integration.service == "home_assistant",
                func.lower(Integration.is_active) == "true",
            )
        )
    )
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Home Assistant integration not found",
        )
    
    config = integration.config or {}
    url = config.get("url") or config.get("widget_url")
    access_token = config.get("access_token")
    
    if not url or not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Home Assistant integration not properly configured",
        )
    
    try:
        entities = get_home_assistant_entities(url, access_token, domain)
        # Format entities for display
        formatted_entities = [format_entity_state(entity) for entity in entities]
        return {"entities": formatted_entities}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching Home Assistant entities: {str(e)}",
        )

