"""
Document API endpoints for file uploads and management.
Supports drag-and-drop from Outlook with .eml and .ics parsing.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
import uuid
import os

from app.core.database import get_db
from app.core.file_parser import (
    parse_eml, parse_ics, detect_file_type, get_mime_type, sanitize_html
)
from app.models.document import Document
from app.schemas.document import (
    DocumentCreate, DocumentUpdate, DocumentResponse, DocumentListResponse,
    ParsedEmailResponse, ParsedCalendarResponse
)

router = APIRouter()

# Maximum file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024

# Allowed file extensions
ALLOWED_EXTENSIONS = {
    'eml', 'ics', 'ical', 'msg', 'pdf', 'doc', 'docx',
    'xls', 'xlsx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg',
    'gif', 'txt', 'csv'
}


def validate_file_extension(filename: str) -> bool:
    """Check if file extension is allowed."""
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS


def generate_safe_filename(original_filename: str) -> str:
    """Generate a safe unique filename using UUID."""
    ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
    return f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex


@router.get("/customers/{customer_id}/documents", response_model=DocumentListResponse)
async def list_customer_documents(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    file_type: Optional[str] = None,
):
    """List documents for a customer with filtering."""
    query = select(Document).where(Document.customer_id == customer_id)

    if file_type:
        query = query.where(Document.file_type == file_type)

    query = query.order_by(Document.created_at.desc())

    # Count
    count_query = select(func.count()).select_from(Document).where(
        Document.customer_id == customer_id
    )
    if file_type:
        count_query = count_query.where(Document.file_type == file_type)
    total = await db.scalar(count_query)

    # Pagination
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    documents = result.scalars().all()

    return DocumentListResponse(
        items=[DocumentResponse.model_validate(d) for d in documents],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single document."""
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentResponse.model_validate(document)


@router.post("/customers/{customer_id}/documents", response_model=DocumentResponse, status_code=201)
async def upload_document(
    customer_id: int,
    file: UploadFile = File(...),
    engagement_id: Optional[int] = Form(None),
    source: str = Form("upload"),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a document for a customer.
    Automatically parses .eml and .ics files to extract extra_data.
    """
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    if not validate_file_extension(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read file content
    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB"
        )

    # Detect file type and get MIME type
    file_type = detect_file_type(file.filename, content)
    mime_type = get_mime_type(file.filename)

    # Generate safe filename
    safe_filename = generate_safe_filename(file.filename)

    # Initialize document fields
    content_text = None
    content_html = None
    extra_data = {}

    # Parse email files
    if file_type == 'email':
        parsed = parse_eml(content)
        extra_data = {
            'subject': parsed.get('subject'),
            'from_address': parsed.get('from_address'),
            'from_name': parsed.get('from_name'),
            'to_addresses': parsed.get('to_addresses', []),
            'cc_addresses': parsed.get('cc_addresses', []),
            'date': parsed.get('date').isoformat() if parsed.get('date') else None,
            'message_id': parsed.get('message_id'),
            'attachments': parsed.get('attachments', []),
        }
        content_text = parsed.get('body_text')
        content_html = parsed.get('body_html')

    # Parse calendar files
    elif file_type == 'calendar':
        parsed = parse_ics(content)
        if 'error' not in parsed:
            extra_data = {
                'summary': parsed.get('summary'),
                'description': parsed.get('description'),
                'location': parsed.get('location'),
                'start': parsed.get('start').isoformat() if parsed.get('start') else None,
                'end': parsed.get('end').isoformat() if parsed.get('end') else None,
                'organizer': parsed.get('organizer'),
                'attendees': parsed.get('attendees', []),
                'recurrence': parsed.get('recurrence'),
                'uid': parsed.get('uid'),
            }
            content_text = parsed.get('description')

    # Create document record
    document = Document(
        customer_id=customer_id,
        engagement_id=engagement_id,
        filename=safe_filename,
        original_filename=file.filename,
        file_type=file_type,
        mime_type=mime_type,
        file_size=len(content),
        content_text=content_text,
        content_html=content_html,
        extra_data=extra_data,
        source=source,
    )

    db.add(document)
    await db.flush()
    await db.refresh(document)

    return DocumentResponse.model_validate(document)


@router.post("/documents/parse/email", response_model=ParsedEmailResponse)
async def parse_email_file(file: UploadFile = File(...)):
    """
    Parse an email file (.eml) and return structured data.
    Used for preview before creating an engagement.
    """
    if not file.filename or not file.filename.lower().endswith('.eml'):
        raise HTTPException(status_code=400, detail="File must be a .eml email file")

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB"
        )

    parsed = parse_eml(content)

    return ParsedEmailResponse(
        subject=parsed.get('subject'),
        from_address=parsed.get('from_address'),
        from_name=parsed.get('from_name'),
        to_addresses=parsed.get('to_addresses', []),
        cc_addresses=parsed.get('cc_addresses', []),
        date=parsed.get('date'),
        body_text=parsed.get('body_text'),
        body_html=parsed.get('body_html'),
        attachments=parsed.get('attachments', []),
    )


@router.post("/documents/parse/calendar", response_model=ParsedCalendarResponse)
async def parse_calendar_file(file: UploadFile = File(...)):
    """
    Parse a calendar file (.ics) and return structured data.
    Used for preview before creating an engagement.
    """
    if not file.filename or not file.filename.lower().endswith(('.ics', '.ical')):
        raise HTTPException(status_code=400, detail="File must be a .ics calendar file")

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB"
        )

    parsed = parse_ics(content)

    if 'error' in parsed:
        raise HTTPException(status_code=400, detail=parsed['error'])

    return ParsedCalendarResponse(
        summary=parsed.get('summary'),
        description=parsed.get('description'),
        location=parsed.get('location'),
        start=parsed.get('start'),
        end=parsed.get('end'),
        organizer=parsed.get('organizer'),
        attendees=parsed.get('attendees', []),
        recurrence=parsed.get('recurrence'),
    )


@router.patch("/documents/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: int,
    document_in: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a document's extra_data."""
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    update_data = document_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(document, field, value)

    await db.flush()
    await db.refresh(document)

    return DocumentResponse.model_validate(document)


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(document_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a document."""
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    await db.delete(document)
