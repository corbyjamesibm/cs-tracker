"""API endpoints for TargetProcess Solutions."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional, List

from app.core.database import get_db
from app.models.tp_solution import TPSolution, TPSolutionCategory
from app.models.use_case import UseCase
from app.models.use_case_solution_mapping import UseCaseTPSolutionMapping
from app.schemas.tp_solution import (
    TPSolutionResponse, TPSolutionList, TPSolutionCreate, TPSolutionUpdate
)

router = APIRouter(prefix="/tp-solutions", tags=["TargetProcess Solutions"])


@router.get("", response_model=TPSolutionList)
async def list_tp_solutions(
    category: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: AsyncSession = Depends(get_db)
):
    """
    List all TargetProcess solutions with optional filtering.

    - **category**: Filter by solution category (core_solutions, solution_components, budgeting_components, extensions)
    - **search**: Search by name or description
    - **is_active**: Filter by active status (default: True)
    """
    query = select(TPSolution)

    if category:
        try:
            cat_enum = TPSolutionCategory(category.lower())
            query = query.where(TPSolution.category == cat_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")

    if is_active is not None:
        query = query.where(TPSolution.is_active == is_active)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (TPSolution.name.ilike(search_term)) |
            (TPSolution.description.ilike(search_term))
        )

    query = query.order_by(TPSolution.category, TPSolution.name)

    result = await db.execute(query)
    solutions = result.scalars().all()

    return TPSolutionList(
        solutions=[TPSolutionResponse.model_validate(s) for s in solutions],
        total=len(solutions)
    )


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Get list of solution categories with counts."""
    result = await db.execute(
        select(
            TPSolution.category,
            func.count(TPSolution.id).label("count")
        )
        .where(TPSolution.is_active == True)
        .group_by(TPSolution.category)
    )

    categories = []
    for row in result:
        categories.append({
            "category": row[0].value,
            "label": row[0].value.replace("_", " ").title(),
            "count": row[1]
        })

    return {"categories": categories}


@router.get("/{solution_id}", response_model=TPSolutionResponse)
async def get_tp_solution(
    solution_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific TargetProcess solution by ID."""
    result = await db.execute(
        select(TPSolution).where(TPSolution.id == solution_id)
    )
    solution = result.scalar_one_or_none()

    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")

    return TPSolutionResponse.model_validate(solution)


@router.post("", response_model=TPSolutionResponse)
async def create_tp_solution(
    solution: TPSolutionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new TargetProcess solution."""
    # Check for duplicate name
    existing = await db.execute(
        select(TPSolution).where(TPSolution.name == solution.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Solution with this name already exists")

    db_solution = TPSolution(**solution.model_dump())
    db.add(db_solution)
    await db.commit()
    await db.refresh(db_solution)

    return TPSolutionResponse.model_validate(db_solution)


@router.put("/{solution_id}", response_model=TPSolutionResponse)
async def update_tp_solution(
    solution_id: int,
    solution: TPSolutionUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a TargetProcess solution."""
    result = await db.execute(
        select(TPSolution).where(TPSolution.id == solution_id)
    )
    db_solution = result.scalar_one_or_none()

    if not db_solution:
        raise HTTPException(status_code=404, detail="Solution not found")

    update_data = solution.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_solution, field, value)

    await db.commit()
    await db.refresh(db_solution)

    return TPSolutionResponse.model_validate(db_solution)


@router.delete("/{solution_id}")
async def delete_tp_solution(
    solution_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a TargetProcess solution."""
    result = await db.execute(
        select(TPSolution).where(TPSolution.id == solution_id)
    )
    db_solution = result.scalar_one_or_none()

    if not db_solution:
        raise HTTPException(status_code=404, detail="Solution not found")

    await db.delete(db_solution)
    await db.commit()

    return {"message": "Solution deleted successfully"}


@router.get("/{solution_id}/use-cases")
async def get_solution_use_cases(
    solution_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all use cases mapped to a specific TP solution."""
    result = await db.execute(
        select(UseCaseTPSolutionMapping)
        .options(selectinload(UseCaseTPSolutionMapping.use_case))
        .where(UseCaseTPSolutionMapping.tp_solution_id == solution_id)
        .order_by(UseCaseTPSolutionMapping.is_primary.desc(), UseCaseTPSolutionMapping.priority)
    )
    mappings = result.scalars().all()

    return {
        "solution_id": solution_id,
        "use_cases": [
            {
                "id": m.use_case.id,
                "name": m.use_case.name,
                "solution_area": m.use_case.solution_area,
                "is_required": m.is_required,
                "is_primary": m.is_primary,
                "notes": m.notes
            }
            for m in mappings
        ],
        "total": len(mappings)
    }


@router.get("/mappings/by-use-case/{use_case_id}")
async def get_use_case_solutions(
    use_case_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all TP solutions mapped to a specific use case."""
    result = await db.execute(
        select(UseCaseTPSolutionMapping)
        .options(selectinload(UseCaseTPSolutionMapping.tp_solution))
        .where(UseCaseTPSolutionMapping.use_case_id == use_case_id)
        .order_by(UseCaseTPSolutionMapping.is_primary.desc(), UseCaseTPSolutionMapping.priority)
    )
    mappings = result.scalars().all()

    return {
        "use_case_id": use_case_id,
        "solutions": [
            {
                "id": m.tp_solution.id,
                "name": m.tp_solution.name,
                "version": m.tp_solution.version,
                "category": m.tp_solution.category.value,
                "is_required": m.is_required,
                "is_primary": m.is_primary,
                "notes": m.notes
            }
            for m in mappings
        ],
        "total": len(mappings)
    }


@router.get("/mappings/summary")
async def get_mapping_summary(
    db: AsyncSession = Depends(get_db)
):
    """Get a summary of all use case to TP solution mappings."""
    # Get solutions with their use case counts
    result = await db.execute(
        select(
            TPSolution.id,
            TPSolution.name,
            TPSolution.category,
            func.count(UseCaseTPSolutionMapping.id).label("use_case_count"),
            func.count(UseCaseTPSolutionMapping.id).filter(
                UseCaseTPSolutionMapping.is_primary == True
            ).label("primary_count")
        )
        .outerjoin(UseCaseTPSolutionMapping)
        .group_by(TPSolution.id, TPSolution.name, TPSolution.category)
        .order_by(func.count(UseCaseTPSolutionMapping.id).desc())
    )

    solutions = []
    for row in result:
        solutions.append({
            "id": row[0],
            "name": row[1],
            "category": row[2].value,
            "use_case_count": row[3],
            "primary_for_count": row[4]
        })

    # Get total counts
    total_mappings = sum(s["use_case_count"] for s in solutions)
    solutions_with_mappings = sum(1 for s in solutions if s["use_case_count"] > 0)

    return {
        "total_mappings": total_mappings,
        "solutions_with_mappings": solutions_with_mappings,
        "total_solutions": len(solutions),
        "solutions": solutions
    }


@router.get("/mappings/sankey")
async def get_sankey_visualization(
    solution_area: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get Sankey diagram data showing Use Case -> TP Solution flow.

    Returns nodes and links for Chart.js Sankey visualization.

    - **solution_area**: Filter use cases by solution area (e.g., "WFM", "HPM")
    - **category**: Filter TP solutions by category
    """
    # Build query for mappings
    query = select(UseCaseTPSolutionMapping).options(
        selectinload(UseCaseTPSolutionMapping.use_case),
        selectinload(UseCaseTPSolutionMapping.tp_solution)
    )

    result = await db.execute(query)
    mappings = result.scalars().all()

    # Build nodes and links
    nodes = []
    links = []
    seen_use_cases = set()
    seen_solutions = set()

    for mapping in mappings:
        if not mapping.use_case or not mapping.tp_solution:
            continue

        # Filter by solution area if specified
        if solution_area and mapping.use_case.solution_area != solution_area:
            continue

        # Filter by category if specified
        if category:
            try:
                cat_enum = TPSolutionCategory(category.lower())
                if mapping.tp_solution.category != cat_enum:
                    continue
            except ValueError:
                pass

        uc_id = f"uc_{mapping.use_case_id}"
        tp_id = f"tp_{mapping.tp_solution_id}"

        # Add use case node
        if uc_id not in seen_use_cases:
            nodes.append({
                "id": uc_id,
                "name": mapping.use_case.name,
                "type": "use_case",
                "solution_area": mapping.use_case.solution_area
            })
            seen_use_cases.add(uc_id)

        # Add TP solution node
        if tp_id not in seen_solutions:
            nodes.append({
                "id": tp_id,
                "name": mapping.tp_solution.name,
                "type": "tp_solution",
                "category": mapping.tp_solution.category.value,
                "version": mapping.tp_solution.version,
                "is_required": mapping.is_required
            })
            seen_solutions.add(tp_id)

        # Add link
        links.append({
            "from": mapping.use_case.name,
            "to": f"{mapping.tp_solution.name}" + (" *" if mapping.is_required else ""),
            "flow": 10 if mapping.is_required else 5,
            "is_required": mapping.is_required,
            "is_primary": mapping.is_primary,
            "priority": mapping.priority,
            "notes": mapping.notes
        })

    # Get solution areas for filtering
    solution_areas = list(set(
        n.get("solution_area") for n in nodes
        if n.get("type") == "use_case" and n.get("solution_area")
    ))

    # Get categories for filtering
    categories = list(set(
        n.get("category") for n in nodes
        if n.get("type") == "tp_solution" and n.get("category")
    ))

    return {
        "nodes": nodes,
        "links": links,
        "use_case_count": len(seen_use_cases),
        "solution_count": len(seen_solutions),
        "total_mappings": len(links),
        "available_filters": {
            "solution_areas": sorted(solution_areas),
            "categories": sorted(categories)
        }
    }
