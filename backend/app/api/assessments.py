from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, date
import io
import csv

from app.core.database import get_db
from app.models.assessment import (
    AssessmentTemplate, AssessmentDimension, AssessmentQuestion,
    CustomerAssessment, AssessmentResponse, AssessmentStatus
)
from app.schemas.assessment import (
    AssessmentTemplateCreate, AssessmentTemplateUpdate, AssessmentTemplateResponse,
    AssessmentTemplateDetailResponse, AssessmentTemplateListResponse,
    CustomerAssessmentCreate, CustomerAssessmentUpdate, CustomerAssessmentResponse,
    CustomerAssessmentDetailResponse, CustomerAssessmentListResponse,
    AssessmentAnswerCreate, AssessmentAnswerResponse, AssessmentAnswerWithQuestion,
    BatchResponseSubmit, AssessmentHistoryResponse, AssessmentComparison,
    ExcelUploadResult, ExcelResponseUploadResult
)

router = APIRouter()


# ============================================================
# TEMPLATE ENDPOINTS
# ============================================================

@router.get("/templates", response_model=AssessmentTemplateListResponse)
async def list_templates(
    db: AsyncSession = Depends(get_db),
    active_only: bool = Query(False, description="Only show active templates"),
):
    """List all assessment templates."""
    query = select(AssessmentTemplate)

    if active_only:
        query = query.where(AssessmentTemplate.is_active == True)

    query = query.order_by(AssessmentTemplate.created_at.desc())
    query = query.options(selectinload(AssessmentTemplate.created_by))

    result = await db.execute(query)
    templates = result.scalars().all()

    return AssessmentTemplateListResponse(
        items=[AssessmentTemplateResponse.model_validate(t) for t in templates],
        total=len(templates)
    )


@router.get("/templates/active", response_model=Optional[AssessmentTemplateDetailResponse])
async def get_active_template(db: AsyncSession = Depends(get_db)):
    """Get the currently active assessment template with all questions."""
    query = select(AssessmentTemplate).where(
        AssessmentTemplate.is_active == True
    ).options(
        selectinload(AssessmentTemplate.dimensions),
        selectinload(AssessmentTemplate.questions).selectinload(AssessmentQuestion.dimension),
        selectinload(AssessmentTemplate.created_by)
    )

    result = await db.execute(query)
    template = result.scalar_one_or_none()

    if not template:
        return None

    return AssessmentTemplateDetailResponse.model_validate(template)


@router.get("/templates/{template_id}", response_model=AssessmentTemplateDetailResponse)
async def get_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Get a template with all its dimensions and questions."""
    query = select(AssessmentTemplate).where(
        AssessmentTemplate.id == template_id
    ).options(
        selectinload(AssessmentTemplate.dimensions),
        selectinload(AssessmentTemplate.questions).selectinload(AssessmentQuestion.dimension),
        selectinload(AssessmentTemplate.created_by)
    )

    result = await db.execute(query)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return AssessmentTemplateDetailResponse.model_validate(template)


@router.post("/templates", response_model=AssessmentTemplateResponse, status_code=201)
async def create_template(
    template_in: AssessmentTemplateCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new assessment template (JSON)."""
    # Create template
    template = AssessmentTemplate(
        name=template_in.name,
        version=template_in.version,
        description=template_in.description
    )
    db.add(template)
    await db.flush()

    # Create dimensions if provided
    dimension_map = {}  # To map dimension order to id for questions
    if template_in.dimensions:
        for i, dim_data in enumerate(template_in.dimensions):
            dimension = AssessmentDimension(
                template_id=template.id,
                name=dim_data.name,
                description=dim_data.description,
                display_order=dim_data.display_order or i,
                weight=dim_data.weight
            )
            db.add(dimension)
            await db.flush()
            dimension_map[dim_data.name] = dimension.id

    # Create questions if provided
    if template_in.questions:
        for i, q_data in enumerate(template_in.questions):
            question = AssessmentQuestion(
                template_id=template.id,
                dimension_id=q_data.dimension_id,
                question_text=q_data.question_text,
                question_number=q_data.question_number,
                min_score=q_data.min_score,
                max_score=q_data.max_score,
                score_labels=q_data.score_labels,
                display_order=q_data.display_order or i,
                is_required=q_data.is_required
            )
            db.add(question)

    await db.flush()

    return AssessmentTemplateResponse.model_validate(template)


@router.post("/templates/upload", response_model=ExcelUploadResult)
async def upload_template_excel(
    file: UploadFile = File(...),
    name: str = Query(..., description="Template name"),
    version: str = Query(..., description="Template version"),
    description: Optional[str] = Query(None, description="Template description"),
    db: AsyncSession = Depends(get_db)
):
    """Upload an Excel or CSV file to create a new assessment template."""
    errors = []
    contents = await file.read()
    filename = file.filename.lower() if file.filename else ""

    # Determine file type and parse accordingly
    if filename.endswith('.csv'):
        # Parse CSV file (specifically handles TBM Maturity Assessment format)
        rows = parse_csv_file(contents)
    else:
        # Parse Excel file
        try:
            import openpyxl
            rows = parse_excel_file(contents)
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="openpyxl library not installed. Please install it with: pip install openpyxl"
            )
        except Exception as e:
            return ExcelUploadResult(success=False, errors=[f"Failed to read Excel file: {str(e)}"])

    if not rows:
        return ExcelUploadResult(success=False, errors=["No data found in file"])

    # Create template
    template = AssessmentTemplate(name=name, version=version, description=description)
    db.add(template)
    await db.flush()

    dimension_map = {}  # name -> dimension_id
    dimensions_created = 0
    questions_created = 0
    current_dimension = None
    current_dimension_desc = None
    question_number = 1

    # Parse TBM-style format (dimension headers with questions below)
    for row_idx, row in enumerate(rows):
        if not row or not row[0]:
            continue

        first_cell = str(row[0]).strip()

        # Skip header row and empty rows
        if first_cell.lower().startswith('tbm practice') or first_cell.lower().startswith('maturity dimension'):
            continue

        # Check if this is a dimension header (single cell with no "0 - NA" in second column)
        second_cell = str(row[1]).strip() if len(row) > 1 and row[1] else ""

        # If second cell is empty or doesn't look like a score option, this might be a dimension
        if not second_cell or (not second_cell.startswith('0 -') and not second_cell.startswith('Enter')):
            # Check if this is a short title (dimension name) - typically short and no punctuation at end
            if len(first_cell) < 50 and not first_cell.endswith('.') and not first_cell.endswith(','):
                # This is likely a dimension name
                current_dimension = first_cell
                current_dimension_desc = None
                question_number = 1
                continue
            else:
                # This might be a dimension description - store it
                if current_dimension and not current_dimension_desc:
                    current_dimension_desc = first_cell
                    continue

        # This is a question row
        if current_dimension and (second_cell.startswith('0 -') or 'NA' in second_cell.upper()):
            dim_key = current_dimension.lower()

            # Create dimension if not exists
            if dim_key not in dimension_map:
                dimension = AssessmentDimension(
                    template_id=template.id,
                    name=current_dimension,
                    description=current_dimension_desc,
                    display_order=dimensions_created
                )
                db.add(dimension)
                await db.flush()
                dimension_map[dim_key] = dimension.id
                dimensions_created += 1

            # Create question
            # Extract score labels from the dropdown values (0 - NA / Opt Out, 1 - Basic, etc.)
            score_labels = {
                "0": "NA / Opt Out",
                "1": "Initial",
                "2": "Developing",
                "3": "Defined",
                "4": "Managed",
                "5": "Optimized"
            }

            question = AssessmentQuestion(
                template_id=template.id,
                dimension_id=dimension_map[dim_key],
                question_text=first_cell,
                question_number=f"{dimensions_created}.{question_number}",
                min_score=0,
                max_score=5,
                score_labels=score_labels,
                display_order=questions_created,
                is_required=True
            )
            db.add(question)
            questions_created += 1
            question_number += 1

    await db.flush()

    return ExcelUploadResult(
        success=True,
        template_id=template.id,
        dimensions_created=dimensions_created,
        questions_created=questions_created,
        errors=errors
    )


def parse_csv_file(contents: bytes) -> List[List[str]]:
    """Parse CSV file contents into rows."""
    try:
        # Try UTF-8 first, then fallback to latin-1
        try:
            text = contents.decode('utf-8')
        except UnicodeDecodeError:
            text = contents.decode('latin-1')

        reader = csv.reader(io.StringIO(text))
        return list(reader)
    except Exception as e:
        return []


def parse_excel_file(contents: bytes) -> List[List]:
    """Parse Excel file contents into rows."""
    import openpyxl
    workbook = openpyxl.load_workbook(io.BytesIO(contents))
    sheet = workbook.active

    rows = []
    for row in sheet.iter_rows(values_only=True):
        rows.append(list(row))
    return rows


@router.patch("/templates/{template_id}", response_model=AssessmentTemplateResponse)
async def update_template(
    template_id: int,
    template_in: AssessmentTemplateUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a template's metadata."""
    query = select(AssessmentTemplate).where(AssessmentTemplate.id == template_id)
    result = await db.execute(query)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    update_data = template_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)

    await db.flush()

    return AssessmentTemplateResponse.model_validate(template)


@router.post("/templates/{template_id}/activate", response_model=AssessmentTemplateResponse)
async def activate_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Set a template as the active version (deactivates others)."""
    # First deactivate all
    all_templates = await db.execute(select(AssessmentTemplate))
    for t in all_templates.scalars():
        t.is_active = False

    # Activate the specified one
    query = select(AssessmentTemplate).where(AssessmentTemplate.id == template_id)
    result = await db.execute(query)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template.is_active = True
    await db.flush()
    await db.refresh(template)

    return AssessmentTemplateResponse.model_validate(template)


@router.delete("/templates/{template_id}", status_code=204)
async def delete_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a template (only if no assessments use it)."""
    # Check if any assessments use this template
    count = await db.scalar(
        select(func.count()).select_from(CustomerAssessment).where(
            CustomerAssessment.template_id == template_id
        )
    )

    if count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete template: {count} assessments are using it"
        )

    query = select(AssessmentTemplate).where(AssessmentTemplate.id == template_id)
    result = await db.execute(query)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    await db.delete(template)


# ============================================================
# CUSTOMER ASSESSMENT ENDPOINTS
# ============================================================

@router.get("/customer/{customer_id}", response_model=CustomerAssessmentListResponse)
async def list_customer_assessments(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    status: Optional[AssessmentStatus] = None,
):
    """List all assessments for a customer."""
    query = select(CustomerAssessment).where(
        CustomerAssessment.customer_id == customer_id
    )

    if status:
        query = query.where(CustomerAssessment.status == status)

    query = query.order_by(CustomerAssessment.assessment_date.desc(), CustomerAssessment.id.desc())
    query = query.options(
        selectinload(CustomerAssessment.template),
        selectinload(CustomerAssessment.completed_by)
    )

    result = await db.execute(query)
    assessments = result.scalars().all()

    return CustomerAssessmentListResponse(
        items=[CustomerAssessmentResponse.model_validate(a) for a in assessments],
        total=len(assessments)
    )


@router.get("/customer/{customer_id}/history", response_model=AssessmentHistoryResponse)
async def get_customer_assessment_history(
    customer_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get assessment history with comparison to previous."""
    query = select(CustomerAssessment).where(
        and_(
            CustomerAssessment.customer_id == customer_id,
            CustomerAssessment.status == AssessmentStatus.COMPLETED
        )
    ).order_by(CustomerAssessment.assessment_date.desc(), CustomerAssessment.id.desc())
    query = query.options(selectinload(CustomerAssessment.template))

    result = await db.execute(query)
    assessments = list(result.scalars().all())

    comparison = None
    if len(assessments) >= 2:
        current = assessments[0]
        previous = assessments[1]

        # Calculate dimension changes
        dimension_changes = {}
        if current.dimension_scores and previous.dimension_scores:
            for dim in current.dimension_scores:
                if dim in previous.dimension_scores:
                    dimension_changes[dim] = round(
                        current.dimension_scores[dim] - previous.dimension_scores[dim], 2
                    )

        overall_change = None
        if current.overall_score is not None and previous.overall_score is not None:
            overall_change = round(current.overall_score - previous.overall_score, 2)

        comparison = AssessmentComparison(
            current=CustomerAssessmentResponse.model_validate(current),
            previous=CustomerAssessmentResponse.model_validate(previous),
            dimension_changes=dimension_changes,
            overall_change=overall_change
        )

    return AssessmentHistoryResponse(
        assessments=[CustomerAssessmentResponse.model_validate(a) for a in assessments],
        comparison=comparison
    )


@router.post("/customer/{customer_id}", response_model=CustomerAssessmentResponse, status_code=201)
async def create_customer_assessment(
    customer_id: int,
    assessment_in: CustomerAssessmentCreate,
    db: AsyncSession = Depends(get_db)
):
    """Start a new assessment for a customer."""
    # Verify template exists
    template = await db.get(AssessmentTemplate, assessment_in.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    assessment = CustomerAssessment(
        customer_id=customer_id,
        template_id=assessment_in.template_id,
        assessment_date=assessment_in.assessment_date or date.today(),
        notes=assessment_in.notes,
        status=AssessmentStatus.DRAFT
    )
    db.add(assessment)
    await db.flush()

    return CustomerAssessmentResponse.model_validate(assessment)


@router.get("/{assessment_id}", response_model=CustomerAssessmentDetailResponse)
async def get_assessment(assessment_id: int, db: AsyncSession = Depends(get_db)):
    """Get an assessment with all responses."""
    query = select(CustomerAssessment).where(
        CustomerAssessment.id == assessment_id
    ).options(
        selectinload(CustomerAssessment.customer),
        selectinload(CustomerAssessment.template).selectinload(AssessmentTemplate.dimensions),
        selectinload(CustomerAssessment.template).selectinload(AssessmentTemplate.questions),
        selectinload(CustomerAssessment.completed_by),
        selectinload(CustomerAssessment.responses).selectinload(AssessmentResponse.question).selectinload(AssessmentQuestion.dimension)
    )

    result = await db.execute(query)
    assessment = result.scalar_one_or_none()

    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    return CustomerAssessmentDetailResponse.model_validate(assessment)


@router.patch("/{assessment_id}", response_model=CustomerAssessmentResponse)
async def update_assessment(
    assessment_id: int,
    assessment_in: CustomerAssessmentUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an assessment's status or notes."""
    query = select(CustomerAssessment).where(CustomerAssessment.id == assessment_id)
    result = await db.execute(query)
    assessment = result.scalar_one_or_none()

    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    update_data = assessment_in.model_dump(exclude_unset=True)

    # If completing, set completed_at
    if update_data.get("status") == AssessmentStatus.COMPLETED:
        update_data["completed_at"] = datetime.utcnow()

    for field, value in update_data.items():
        setattr(assessment, field, value)

    await db.flush()

    return CustomerAssessmentResponse.model_validate(assessment)


@router.delete("/{assessment_id}", status_code=204)
async def delete_assessment(assessment_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an assessment."""
    query = select(CustomerAssessment).where(CustomerAssessment.id == assessment_id)
    result = await db.execute(query)
    assessment = result.scalar_one_or_none()

    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    await db.delete(assessment)


# ============================================================
# RESPONSE ENDPOINTS
# ============================================================

@router.post("/{assessment_id}/responses", response_model=CustomerAssessmentResponse)
async def save_responses(
    assessment_id: int,
    batch: BatchResponseSubmit,
    db: AsyncSession = Depends(get_db)
):
    """Save multiple responses at once."""
    query = select(CustomerAssessment).where(
        CustomerAssessment.id == assessment_id
    ).options(
        selectinload(CustomerAssessment.responses).selectinload(AssessmentResponse.question).selectinload(AssessmentQuestion.dimension)
    )
    result = await db.execute(query)
    assessment = result.scalar_one_or_none()

    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Delete existing responses for questions being updated
    question_ids = {r.question_id for r in batch.responses}
    for existing in list(assessment.responses):
        if existing.question_id in question_ids:
            await db.delete(existing)

    # Add new responses
    for response_data in batch.responses:
        response = AssessmentResponse(
            customer_assessment_id=assessment_id,
            question_id=response_data.question_id,
            score=response_data.score,
            notes=response_data.notes
        )
        db.add(response)

    # Update status
    if batch.complete:
        assessment.status = AssessmentStatus.COMPLETED
        assessment.completed_at = datetime.utcnow()
    elif assessment.status == AssessmentStatus.DRAFT:
        assessment.status = AssessmentStatus.IN_PROGRESS

    await db.flush()

    # Calculate scores using direct SQL query for reliability
    score_query = select(
        AssessmentDimension.name,
        func.avg(AssessmentResponse.score).label('avg_score')
    ).select_from(AssessmentResponse).join(
        AssessmentQuestion, AssessmentResponse.question_id == AssessmentQuestion.id
    ).join(
        AssessmentDimension, AssessmentQuestion.dimension_id == AssessmentDimension.id
    ).where(
        AssessmentResponse.customer_assessment_id == assessment_id
    ).group_by(AssessmentDimension.name)

    score_result = await db.execute(score_query)
    dimension_scores = {row.name: float(row.avg_score) for row in score_result}

    # Calculate overall score
    overall_score = sum(dimension_scores.values()) / len(dimension_scores) if dimension_scores else None

    # Update assessment with calculated scores
    assessment.dimension_scores = dimension_scores
    assessment.overall_score = overall_score

    await db.flush()
    await db.refresh(assessment)

    return CustomerAssessmentResponse.model_validate(assessment)


@router.post("/customer/{customer_id}/upload", response_model=ExcelResponseUploadResult)
async def upload_assessment_responses(
    customer_id: int,
    file: UploadFile = File(...),
    template_id: Optional[int] = Query(None, description="Template ID (uses active if not specified)"),
    assessment_date: Optional[date] = Query(None, description="Assessment date"),
    db: AsyncSession = Depends(get_db)
):
    """Upload an Excel file with completed assessment responses."""
    try:
        import openpyxl
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="openpyxl library not installed"
        )

    errors = []

    # Get template
    if template_id:
        template = await db.get(AssessmentTemplate, template_id)
    else:
        query = select(AssessmentTemplate).where(AssessmentTemplate.is_active == True)
        result = await db.execute(query)
        template = result.scalar_one_or_none()

    if not template:
        return ExcelResponseUploadResult(
            success=False,
            errors=["No template specified and no active template found"]
        )

    # Load template questions
    query = select(AssessmentTemplate).where(
        AssessmentTemplate.id == template.id
    ).options(selectinload(AssessmentTemplate.questions))
    result = await db.execute(query)
    template = result.scalar_one()

    # Build question number -> question mapping
    question_map = {q.question_number: q for q in template.questions}

    # Read Excel file
    try:
        contents = await file.read()
        workbook = openpyxl.load_workbook(io.BytesIO(contents))
        sheet = workbook.active
    except Exception as e:
        return ExcelResponseUploadResult(success=False, errors=[f"Failed to read Excel file: {str(e)}"])

    # Create assessment
    assessment = CustomerAssessment(
        customer_id=customer_id,
        template_id=template.id,
        assessment_date=assessment_date or date.today(),
        status=AssessmentStatus.IN_PROGRESS
    )
    db.add(assessment)
    await db.flush()

    responses_saved = 0

    # Parse responses - expect columns like: Question Number, Score, Notes (optional)
    headers = [str(cell.value).lower() if cell.value else '' for cell in sheet[1]]
    num_col = next((i for i, h in enumerate(headers) if 'number' in h or 'num' in h or '#' in h or 'question' in h), 0)
    score_col = next((i for i, h in enumerate(headers) if 'score' in h or 'rating' in h or 'answer' in h), 1)
    notes_col = next((i for i, h in enumerate(headers) if 'note' in h or 'comment' in h), None)

    for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
        if not row or not row[num_col]:
            continue

        q_num = str(row[num_col]).strip()
        if q_num not in question_map:
            errors.append(f"Row {row_idx}: Unknown question number '{q_num}'")
            continue

        try:
            score = int(row[score_col])
        except (TypeError, ValueError):
            errors.append(f"Row {row_idx}: Invalid score value")
            continue

        question = question_map[q_num]
        if score < question.min_score or score > question.max_score:
            errors.append(f"Row {row_idx}: Score {score} out of range ({question.min_score}-{question.max_score})")
            continue

        response = AssessmentResponse(
            customer_assessment_id=assessment.id,
            question_id=question.id,
            score=score,
            notes=str(row[notes_col]).strip() if notes_col and row[notes_col] else None
        )
        db.add(response)
        responses_saved += 1

    await db.flush()

    # Load responses and calculate scores
    query = select(CustomerAssessment).where(
        CustomerAssessment.id == assessment.id
    ).options(
        selectinload(CustomerAssessment.responses).selectinload(AssessmentResponse.question).selectinload(AssessmentQuestion.dimension)
    )
    result = await db.execute(query)
    assessment = result.scalar_one()

    # Calculate scores and mark complete
    assessment.calculate_scores()
    assessment.status = AssessmentStatus.COMPLETED
    assessment.completed_at = datetime.utcnow()
    await db.flush()

    return ExcelResponseUploadResult(
        success=True,
        assessment_id=assessment.id,
        responses_saved=responses_saved,
        errors=errors
    )
