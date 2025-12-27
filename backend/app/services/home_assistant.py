"""Home Assistant API service for fetching states and controlling entities."""

import httpx
from typing import Dict, List, Optional, Any
from datetime import datetime


def test_home_assistant_connection(url: str, access_token: str) -> Dict[str, Any]:
    """Test Home Assistant connection and return connection status."""
    try:
        # Normalize URL (remove trailing slash)
        base_url = url.rstrip('/')
        if not base_url.startswith(('http://', 'https://')):
            return {
                "success": False,
                "message": "URL must start with http:// or https://",
            }
        
        # Test connection by fetching the config endpoint
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        
        with httpx.Client(timeout=10.0) as client:
            response = client.get(f"{base_url}/api/config", headers=headers)
            
            if response.status_code == 200:
                config = response.json()
                return {
                    "success": True,
                    "message": f"Connected to Home Assistant: {config.get('location_name', 'Unknown')}",
                    "details": {
                        "version": config.get("version"),
                        "location_name": config.get("location_name"),
                    },
                }
            elif response.status_code == 401:
                return {
                    "success": False,
                    "message": "Invalid access token. Please check your long-lived access token.",
                }
            else:
                return {
                    "success": False,
                    "message": f"Connection failed: {response.status_code} {response.text[:100]}",
                }
    except httpx.TimeoutException:
        return {
            "success": False,
            "message": "Connection timeout. Please check your Home Assistant URL.",
        }
    except httpx.RequestError as e:
        return {
            "success": False,
            "message": f"Connection error: {str(e)}",
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error: {str(e)}",
        }


def get_home_assistant_states(url: str, access_token: str, entity_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    """Fetch Home Assistant entity states."""
    try:
        base_url = url.rstrip('/')
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        
        with httpx.Client(timeout=10.0) as client:
            if entity_ids:
                # Fetch specific entities
                states = []
                for entity_id in entity_ids:
                    response = client.get(
                        f"{base_url}/api/states/{entity_id}",
                        headers=headers
                    )
                    if response.status_code == 200:
                        states.append(response.json())
                return {"states": states}
            else:
                # Fetch all states
                response = client.get(f"{base_url}/api/states", headers=headers)
                if response.status_code == 200:
                    return {"states": response.json()}
                else:
                    raise Exception(f"Failed to fetch states: {response.status_code}")
    except Exception as e:
        raise Exception(f"Error fetching Home Assistant states: {str(e)}")


def call_home_assistant_service(
    url: str,
    access_token: str,
    domain: str,
    service: str,
    entity_id: Optional[str] = None,
    service_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Call a Home Assistant service."""
    try:
        base_url = url.rstrip('/')
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        
        payload = {}
        if entity_id:
            payload["entity_id"] = entity_id
        if service_data:
            payload.update(service_data)
        
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{base_url}/api/services/{domain}/{service}",
                headers=headers,
                json=payload,
            )
            
            if response.status_code in (200, 201):
                return {
                    "success": True,
                    "message": f"Service {domain}.{service} called successfully",
                    "data": response.json() if response.content else None,
                }
            else:
                error_text = response.text[:200] if response.text else "Unknown error"
                return {
                    "success": False,
                    "message": f"Failed to call service: {response.status_code} - {error_text}",
                }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error calling service: {str(e)}",
        }


def get_home_assistant_entities(url: str, access_token: str, domain: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get list of Home Assistant entities, optionally filtered by domain."""
    try:
        base_url = url.rstrip('/')
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        
        with httpx.Client(timeout=10.0) as client:
            response = client.get(f"{base_url}/api/states", headers=headers)
            if response.status_code == 200:
                all_states = response.json()
                if domain:
                    # Filter by domain (e.g., 'light', 'switch', 'sensor')
                    filtered = [state for state in all_states if state.get("entity_id", "").startswith(f"{domain}.")]
                    return filtered
                return all_states
            else:
                raise Exception(f"Failed to fetch entities: {response.status_code}")
    except Exception as e:
        raise Exception(f"Error fetching entities: {str(e)}")


def format_entity_state(state: Dict[str, Any]) -> Dict[str, Any]:
    """Format entity state for display."""
    entity_id = state.get("entity_id", "")
    attributes = state.get("attributes", {})
    state_value = state.get("state", "unknown")
    
    # Determine entity type from entity_id
    domain = entity_id.split(".")[0] if "." in entity_id else "unknown"
    
    # Get friendly name
    friendly_name = attributes.get("friendly_name", entity_id)
    
    # Format based on domain
    formatted = {
        "entity_id": entity_id,
        "domain": domain,
        "state": state_value,
        "friendly_name": friendly_name,
        "attributes": attributes,
    }
    
    # Add domain-specific formatting
    if domain == "light":
        formatted["is_on"] = state_value == "on"
        formatted["brightness"] = attributes.get("brightness", 0)
        formatted["color_mode"] = attributes.get("color_mode")
        formatted["rgb_color"] = attributes.get("rgb_color")
    elif domain == "switch":
        formatted["is_on"] = state_value == "on"
    elif domain == "sensor":
        formatted["unit"] = attributes.get("unit_of_measurement", "")
        formatted["value"] = state_value
    elif domain == "climate":
        formatted["temperature"] = attributes.get("temperature")
        formatted["current_temperature"] = attributes.get("current_temperature")
        formatted["hvac_mode"] = state_value
    elif domain == "cover":
        formatted["position"] = attributes.get("current_position", 0)
        formatted["is_open"] = state_value == "open"
    
    return formatted

