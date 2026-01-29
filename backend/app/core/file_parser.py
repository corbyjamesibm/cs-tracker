"""
File parsing utilities for emails (.eml) and calendar events (.ics).
Includes HTML sanitization for security.
"""

import email
from email import policy
from email.parser import BytesParser
from email.utils import parsedate_to_datetime, parseaddr
from typing import Optional, List, Tuple
from datetime import datetime
import re

import bleach
from icalendar import Calendar


# Allowed HTML tags and attributes for sanitization
ALLOWED_TAGS = [
    'a', 'abbr', 'acronym', 'b', 'blockquote', 'br', 'code', 'div',
    'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li',
    'ol', 'p', 'pre', 'span', 'strong', 'table', 'tbody', 'td', 'th',
    'thead', 'tr', 'u', 'ul'
]

ALLOWED_ATTRIBUTES = {
    '*': ['class', 'style'],
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan'],
}

ALLOWED_PROTOCOLS = ['http', 'https', 'mailto']


def sanitize_html(html: str) -> str:
    """
    Sanitize HTML content to prevent XSS attacks.

    Args:
        html: Raw HTML content

    Returns:
        Sanitized HTML safe for display
    """
    if not html:
        return ""

    return bleach.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=True
    )


def parse_email_address(addr_string: str) -> Tuple[str, str]:
    """
    Parse an email address string into name and email.

    Args:
        addr_string: Address string like "John Doe <john@example.com>"

    Returns:
        Tuple of (name, email)
    """
    name, email_addr = parseaddr(addr_string)
    return name or "", email_addr or ""


def parse_eml(content: bytes) -> dict:
    """
    Parse a .eml email file.

    Args:
        content: Raw bytes of the .eml file

    Returns:
        Dictionary with parsed email data
    """
    parser = BytesParser(policy=policy.default)
    msg = parser.parsebytes(content)

    # Extract sender
    from_header = msg.get('From', '')
    from_name, from_address = parse_email_address(from_header)

    # Extract recipients
    to_addresses = []
    to_header = msg.get('To', '')
    if to_header:
        for addr in to_header.split(','):
            _, email_addr = parse_email_address(addr.strip())
            if email_addr:
                to_addresses.append(email_addr)

    # Extract CC
    cc_addresses = []
    cc_header = msg.get('Cc', '')
    if cc_header:
        for addr in cc_header.split(','):
            _, email_addr = parse_email_address(addr.strip())
            if email_addr:
                cc_addresses.append(email_addr)

    # Parse date
    date = None
    date_header = msg.get('Date')
    if date_header:
        try:
            date = parsedate_to_datetime(date_header)
        except (ValueError, TypeError):
            pass

    # Extract body
    body_text = None
    body_html = None

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type == 'text/plain' and body_text is None:
                body_text = part.get_content()
            elif content_type == 'text/html' and body_html is None:
                body_html = part.get_content()
    else:
        content_type = msg.get_content_type()
        if content_type == 'text/plain':
            body_text = msg.get_content()
        elif content_type == 'text/html':
            body_html = msg.get_content()

    # Sanitize HTML content
    if body_html:
        body_html = sanitize_html(body_html)

    # Extract attachments info (without content)
    attachments = []
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_disposition() == 'attachment':
                filename = part.get_filename()
                if filename:
                    attachments.append({
                        'filename': filename,
                        'content_type': part.get_content_type(),
                        'size': len(part.get_content()) if hasattr(part, 'get_content') else None
                    })

    return {
        'subject': msg.get('Subject', ''),
        'from_address': from_address,
        'from_name': from_name,
        'to_addresses': to_addresses,
        'cc_addresses': cc_addresses,
        'date': date,
        'body_text': body_text,
        'body_html': body_html,
        'attachments': attachments,
        'message_id': msg.get('Message-ID', ''),
        'in_reply_to': msg.get('In-Reply-To', ''),
    }


def parse_ics(content: bytes) -> dict:
    """
    Parse a .ics calendar file.

    Args:
        content: Raw bytes of the .ics file

    Returns:
        Dictionary with parsed calendar event data
    """
    try:
        cal = Calendar.from_ical(content)
    except Exception as e:
        return {'error': f'Failed to parse calendar: {str(e)}'}

    # Find the first VEVENT component
    for component in cal.walk():
        if component.name == 'VEVENT':
            # Extract basic fields
            summary = str(component.get('SUMMARY', ''))
            description = str(component.get('DESCRIPTION', ''))
            location = str(component.get('LOCATION', ''))

            # Sanitize description if it contains HTML
            if description and ('<' in description and '>' in description):
                description = sanitize_html(description)

            # Extract dates
            start = None
            end = None

            dtstart = component.get('DTSTART')
            if dtstart:
                start = dtstart.dt
                if hasattr(start, 'date'):
                    # It's a datetime, keep it
                    if not hasattr(start, 'tzinfo') or start.tzinfo is None:
                        # Naive datetime, assume UTC
                        pass
                else:
                    # It's a date, convert to datetime
                    start = datetime.combine(start, datetime.min.time())

            dtend = component.get('DTEND')
            if dtend:
                end = dtend.dt
                if hasattr(end, 'date'):
                    if not hasattr(end, 'tzinfo') or end.tzinfo is None:
                        pass
                else:
                    end = datetime.combine(end, datetime.min.time())

            # Extract organizer
            organizer = None
            org = component.get('ORGANIZER')
            if org:
                organizer_str = str(org)
                # Remove mailto: prefix if present
                if organizer_str.startswith('mailto:'):
                    organizer_str = organizer_str[7:]
                organizer = organizer_str

            # Extract attendees
            attendees = []
            raw_attendees = component.get('ATTENDEE')
            if raw_attendees:
                # Ensure we have a list (single attendee comes as single object, not list)
                if not isinstance(raw_attendees, list):
                    raw_attendees = [raw_attendees]

                for attendee in raw_attendees:
                    attendee_str = str(attendee)
                    if attendee_str.startswith('mailto:'):
                        attendee_str = attendee_str[7:]

                    # Get attendee parameters
                    partstat = attendee.params.get('PARTSTAT', 'NEEDS-ACTION') if hasattr(attendee, 'params') else 'NEEDS-ACTION'
                    cn = attendee.params.get('CN', '') if hasattr(attendee, 'params') else ''

                    attendees.append({
                        'email': attendee_str,
                        'name': cn,
                        'status': partstat
                    })

            # Extract recurrence rule
            recurrence = None
            rrule = component.get('RRULE')
            if rrule:
                recurrence = str(rrule.to_ical().decode('utf-8'))

            # Extract UID for tracking
            uid = str(component.get('UID', ''))

            return {
                'summary': summary,
                'description': description,
                'location': location,
                'start': start,
                'end': end,
                'organizer': organizer,
                'attendees': attendees,
                'recurrence': recurrence,
                'uid': uid,
            }

    return {'error': 'No calendar event found in file'}


def detect_file_type(filename: str, content: bytes) -> str:
    """
    Detect the file type based on filename extension and content.

    Args:
        filename: Original filename
        content: File content bytes

    Returns:
        File type string (email, calendar, pdf, etc.)
    """
    ext = filename.lower().split('.')[-1] if '.' in filename else ''

    # Check extension first
    extension_map = {
        'eml': 'email',
        'msg': 'email',
        'ics': 'calendar',
        'ical': 'calendar',
        'pdf': 'pdf',
        'doc': 'document',
        'docx': 'document',
        'xls': 'spreadsheet',
        'xlsx': 'spreadsheet',
        'ppt': 'presentation',
        'pptx': 'presentation',
        'png': 'image',
        'jpg': 'image',
        'jpeg': 'image',
        'gif': 'image',
        'txt': 'text',
        'csv': 'data',
    }

    if ext in extension_map:
        return extension_map[ext]

    # Try to detect from content
    if content:
        # Check for email headers
        if content[:20].lower().startswith(b'from:') or content[:20].lower().startswith(b'received:'):
            return 'email'

        # Check for iCalendar
        if b'BEGIN:VCALENDAR' in content[:100]:
            return 'calendar'

        # Check for PDF
        if content[:4] == b'%PDF':
            return 'pdf'

    return 'other'


def get_mime_type(filename: str) -> str:
    """
    Get MIME type based on filename extension.

    Args:
        filename: Original filename

    Returns:
        MIME type string
    """
    ext = filename.lower().split('.')[-1] if '.' in filename else ''

    mime_map = {
        'eml': 'message/rfc822',
        'msg': 'application/vnd.ms-outlook',
        'ics': 'text/calendar',
        'ical': 'text/calendar',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'html': 'text/html',
        'htm': 'text/html',
    }

    return mime_map.get(ext, 'application/octet-stream')
