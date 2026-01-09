from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.task import Task, TaskStatus, TaskPriority
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskListResponse

router = APIRouter()


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    customer_id: Optional[int] = None,
    assignee_id: Optional[int] = None,
    due_filter: Optional[str] = Query(None, regex="^(overdue|today|this_week|this_month)$"),
):
    """List tasks with filtering."""
    query = select(Task)

    # Filters
    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)
    if customer_id:
        query = query.where(Task.customer_id == customer_id)
    if assignee_id:
        query = query.where(Task.assignee_id == assignee_id)

    # Due date filters
    now = datetime.now()
    if due_filter == "overdue":
        query = query.where(and_(
            Task.due_date < now,
            Task.status.in_([TaskStatus.OPEN, TaskStatus.IN_PROGRESS])
        ))
    elif due_filter == "today":
        end_of_day = now.replace(hour=23, minute=59, second=59)
        query = query.where(and_(
            Task.due_date >= now,
            Task.due_date <= end_of_day
        ))
    elif due_filter == "this_week":
        end_of_week = now + timedelta(days=7)
        query = query.where(and_(
            Task.due_date >= now,
            Task.due_date <= end_of_week
        ))
    elif due_filter == "this_month":
        end_of_month = now + timedelta(days=30)
        query = query.where(and_(
            Task.due_date >= now,
            Task.due_date <= end_of_month
        ))

    # Default: open tasks first, then by due date
    query = query.order_by(Task.status, Task.due_date.asc().nullslast())

    # Count
    count_query = select(func.count()).select_from(Task)
    if status:
        count_query = count_query.where(Task.status == status)
    total = await db.scalar(count_query)

    # Pagination and eager load
    query = query.offset(skip).limit(limit)
    query = query.options(
        selectinload(Task.customer),
        selectinload(Task.assignee)
    )

    result = await db.execute(query)
    tasks = result.scalars().all()

    return TaskListResponse(
        items=[TaskResponse.model_validate(t) for t in tasks],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single task."""
    query = select(Task).where(Task.id == task_id).options(
        selectinload(Task.customer),
        selectinload(Task.assignee)
    )
    result = await db.execute(query)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return TaskResponse.model_validate(task)


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(task_in: TaskCreate, db: AsyncSession = Depends(get_db)):
    """Create a new task."""
    task = Task(**task_in.model_dump())
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a task."""
    query = select(Task).where(Task.id == task_id)
    result = await db.execute(query)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_in.model_dump(exclude_unset=True)

    # Handle status changes
    if "status" in update_data and update_data["status"] == TaskStatus.COMPLETED:
        update_data["completed_at"] = datetime.now()

    for field, value in update_data.items():
        setattr(task, field, value)

    await db.flush()
    await db.refresh(task)
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: int,
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Mark a task as complete."""
    query = select(Task).where(Task.id == task_id)
    result = await db.execute(query)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = TaskStatus.COMPLETED
    task.completed_at = datetime.now()
    if notes:
        task.completion_notes = notes

    await db.flush()
    await db.refresh(task)
    return TaskResponse.model_validate(task)


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a task."""
    query = select(Task).where(Task.id == task_id)
    result = await db.execute(query)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.delete(task)
