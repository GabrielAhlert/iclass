from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional
from app.models import TaskStatus, FIBONACCI


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    weight_index: int = 0
    due_date: Optional[datetime] = None

    @field_validator("weight_index")
    @classmethod
    def validate_weight(cls, v: int) -> int:
        if v < 0 or v > 9:
            raise ValueError("weight_index must be between 0 and 9")
        return v


class TaskRead(BaseModel):
    id: int
    title: str
    description: Optional[str]
    weight_index: int
    weight: int
    status: TaskStatus
    due_date: Optional[datetime]
    created_at: datetime
    creator_id: int

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_weight(cls, task):
        data = {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "weight_index": task.weight_index,
            "weight": FIBONACCI[task.weight_index],
            "status": task.status,
            "due_date": task.due_date,
            "created_at": task.created_at,
            "creator_id": task.creator_id,
        }
        return cls(**data)


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    weight_index: Optional[int] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[datetime] = None
