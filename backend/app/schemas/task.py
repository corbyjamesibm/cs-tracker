from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

from app.models.task import TaskPriority, TaskStatus


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[datetime] = None


class TaskCreate(TaskBase):
    customer_id: Optional[int] = None
    assignee_id: Optional[int] = None
    reminder_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[datetime] = None
    assignee_id: Optional[int] = None
    completion_notes: Optional[str] = None


class TaskResponse(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: Optional[int] = None
    assignee_id: Optional[int] = None
    status: TaskStatus
    completed_at: Optional[datetime] = None
    completion_notes: Optional[str] = None
    is_overdue: bool
    created_at: datetime
    updated_at: datetime


class TaskListResponse(BaseModel):
    items: List[TaskResponse]
    total: int
    skip: int
    limit: int
