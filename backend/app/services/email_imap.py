"""IMAP email service for fetching emails."""

import imaplib
import email
from email.header import decode_header
from typing import List, Dict, Optional
from datetime import datetime
import ssl


def decode_mime_words(s: str) -> str:
    """Decode MIME encoded words in email headers."""
    if not s:
        return ""
    decoded_parts = decode_header(s)
    decoded_string = ""
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            if encoding:
                decoded_string += part.decode(encoding)
            else:
                decoded_string += part.decode("utf-8", errors="ignore")
        else:
            decoded_string += part
    return decoded_string


def parse_email_date(date_str: str) -> Optional[datetime]:
    """Parse email date string to datetime."""
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(date_str)
    except:
        return None


def format_email_time(email_date: Optional[datetime]) -> str:
    """Format email date as relative time."""
    if not email_date:
        return "Unknown"
    
    # Convert both to naive datetimes for comparison
    if email_date.tzinfo:
        # Convert timezone-aware datetime to UTC, then remove timezone
        from datetime import timezone
        email_date_naive = email_date.astimezone(timezone.utc).replace(tzinfo=None)
        now = datetime.utcnow()
    else:
        # Already timezone-naive
        email_date_naive = email_date
        now = datetime.now()
    
    diff = now - email_date_naive
    
    if diff.days > 7:
        return email_date.strftime("%b %d")
    elif diff.days > 0:
        return f"{diff.days}d ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours}h ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes}m ago"
    else:
        return "Just now"


def test_imap_connection(
    host: str,
    port: int,
    username: str,
    password: str,
    use_ssl: bool = True,
    use_tls: bool = False,
) -> Dict[str, any]:
    """Test IMAP connection and return connection status."""
    try:
        if use_ssl:
            # SSL connection
            mail = imaplib.IMAP4_SSL(host, port)
        else:
            # Non-SSL connection
            mail = imaplib.IMAP4(host, port)
            if use_tls:
                # Start TLS
                context = ssl.create_default_context()
                mail.starttls(context=context)
        
        # Login
        mail.login(username, password)
        
        # Select inbox
        status, messages = mail.select("INBOX")
        
        if status != "OK":
            mail.logout()
            return {
                "success": False,
                "message": f"Failed to select INBOX: {messages}",
            }
        
        # Get mailbox info
        status, response = mail.status("INBOX", "(UNSEEN)")
        unread_count = 0
        if status == "OK" and response[0]:
            unread_count = int(response[0].split()[-1].strip(b')').strip(b'('))
        
        mail.logout()
        
        return {
            "success": True,
            "message": "IMAP connection successful",
            "unread_count": unread_count,
        }
    except imaplib.IMAP4.error as e:
        return {
            "success": False,
            "message": f"IMAP authentication failed: {str(e)}",
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Connection error: {str(e)}",
        }


def fetch_emails(
    host: str,
    port: int,
    username: str,
    password: str,
    use_ssl: bool = True,
    use_tls: bool = False,
    limit: int = 10,
    folder: str = "INBOX",
) -> List[Dict[str, any]]:
    """Fetch emails from IMAP server."""
    emails = []
    
    try:
        if use_ssl:
            mail = imaplib.IMAP4_SSL(host, port)
        else:
            mail = imaplib.IMAP4(host, port)
            if use_tls:
                context = ssl.create_default_context()
                mail.starttls(context=context)
        
        mail.login(username, password)
        mail.select(folder)
        
        # Search for all emails
        status, messages = mail.search(None, "ALL")
        
        if status != "OK":
            mail.logout()
            return emails
        
        # Get email IDs - handle bytes properly
        if not messages or not messages[0]:
            mail.logout()
            return emails
        
        # messages[0] is bytes, decode it first
        email_ids_str = messages[0].decode() if isinstance(messages[0], bytes) else str(messages[0])
        email_ids = [eid.strip() for eid in email_ids_str.split() if eid.strip()]
        
        if not email_ids:
            mail.logout()
            return emails
        
        # Get the most recent emails (limit)
        email_ids = email_ids[-limit:] if len(email_ids) > limit else email_ids
        
        for email_id in reversed(email_ids):
            try:
                # First, check if email is unread by fetching flags
                status_flags, flags_data = mail.fetch(email_id, "(FLAGS)")
                is_unread = True
                if status_flags == "OK" and flags_data:
                    for flag_item in flags_data:
                        if isinstance(flag_item, tuple) and len(flag_item) > 0:
                            flags_str = flag_item[0].decode('utf-8', errors='ignore') if isinstance(flag_item[0], bytes) else str(flag_item[0])
                            if '\\Seen' in flags_str:
                                is_unread = False
                                break
                
                # Fetch email body - standard IMAP format
                status, msg_data = mail.fetch(email_id, "(RFC822)")
                
                if status != "OK" or not msg_data:
                    continue
                
                # Standard IMAP response: [(b'1 (RFC822 {1234}', b'email body...')]
                # msg_data[0] is a tuple, msg_data[0][1] is the email body
                # For large emails, the body might be split across multiple items
                email_body_parts = []
                if msg_data and len(msg_data) > 0:
                    # First item contains metadata and possibly first part of body
                    first_item = msg_data[0]
                    if isinstance(first_item, tuple) and len(first_item) >= 2:
                        # Standard case: tuple with header and body
                        email_body_parts.append(first_item[1])
                    elif isinstance(first_item, bytes):
                        # Sometimes it's just bytes directly
                        email_body_parts.append(first_item)
                    
                    # Collect any additional body parts (for large emails)
                    for item in msg_data[1:]:
                        if isinstance(item, tuple) and len(item) >= 2:
                            email_body_parts.append(item[1])
                        elif isinstance(item, bytes):
                            email_body_parts.append(item)
                
                # Combine all body parts
                if email_body_parts:
                    email_body = b''.join(email_body_parts)
                else:
                    email_body = None
                
                if email_body is None or not isinstance(email_body, bytes) or len(email_body) == 0:
                    continue
                
                # Parse email
                try:
                    email_message = email.message_from_bytes(email_body)
                except Exception as parse_error:
                    # If parsing fails, skip this email
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Error parsing email message for {email_id}: {str(parse_error)}")
                    continue
                
                # Extract headers
                subject = decode_mime_words(email_message.get("Subject", ""))
                from_addr = decode_mime_words(email_message.get("From", ""))
                date_str = email_message.get("Date", "")
                email_date = parse_email_date(date_str)
                
                # Extract email address from "Name <email@example.com>" format
                from_email = from_addr
                if "<" in from_addr and ">" in from_addr:
                    from_email = from_addr.split("<")[-1].split(">")[0].strip()
                elif "@" in from_addr:
                    from_email = from_addr.strip()
                
                # Get preview (first 100 chars of text body)
                preview = ""
                if email_message.is_multipart():
                    for part in email_message.walk():
                        content_type = part.get_content_type()
                        if content_type == "text/plain":
                            try:
                                body = part.get_payload(decode=True).decode("utf-8", errors="ignore")
                                preview = body[:100].strip().replace("\n", " ").replace("\r", "")
                                break
                            except:
                                pass
                else:
                    try:
                        body = email_message.get_payload(decode=True).decode("utf-8", errors="ignore")
                        preview = body[:100].strip().replace("\n", " ").replace("\r", "")
                    except:
                        pass
                
                # is_unread was already determined earlier by checking IMAP FLAGS
                # No need to check again
                
                emails.append({
                    "id": str(email_id),
                    "from": from_email,
                    "from_name": from_addr.split("<")[0].strip() if "<" in from_addr else from_email,
                    "subject": subject or "(No Subject)",
                    "preview": preview,
                    "date": email_date.isoformat() if email_date else None,
                    "time": format_email_time(email_date),
                    "unread": is_unread,
                })
            except Exception as e:
                # Log the error but continue processing other emails
                # Don't fail completely if one email can't be parsed
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Error parsing email {email_id}: {str(e)}", exc_info=True)
                continue
        
        mail.logout()
        
    except Exception as e:
        raise Exception(f"Error fetching emails: {str(e)}")
    
    return emails


def get_unread_count(
    host: str,
    port: int,
    username: str,
    password: str,
    use_ssl: bool = True,
    use_tls: bool = False,
    folder: str = "INBOX",
) -> int:
    """Get unread email count."""
    try:
        if use_ssl:
            mail = imaplib.IMAP4_SSL(host, port)
        else:
            mail = imaplib.IMAP4(host, port)
            if use_tls:
                context = ssl.create_default_context()
                mail.starttls(context=context)
        
        mail.login(username, password)
        status, response = mail.status(folder, "(UNSEEN)")
        
        unread_count = 0
        if status == "OK" and response[0]:
            unread_count = int(response[0].split()[-1].strip(b')').strip(b'('))
        
        mail.logout()
        return unread_count
    except:
        return 0

