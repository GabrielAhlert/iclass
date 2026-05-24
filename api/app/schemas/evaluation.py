from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional


class EvaluationCreate(BaseModel):
    student_id: int
    task_id: int
    grade: float
    participation: float
    feedback: Optional[str] = None

    @field_validator("grade", "participation")
    @classmethod
    def validate_score(cls, v: float) -> float:
        if v < 0 or v > 10:
            raise ValueError("Score must be between 0 and 10")
        return round(v, 2)


class EvaluationRead(BaseModel):
    id: int
    student_id: int
    task_id: int
    grade: float
    participation: float
    feedback: Optional[str]
    evaluated_at: datetime

    class Config:
        from_attributes = True


class EvaluationUpdate(BaseModel):
    grade: Optional[float] = None
    participation: Optional[float] = None
    feedback: Optional[str] = None
