from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from enum import Enum
from datetime import datetime

FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]


class Role(str, Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"


class TaskStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    done = "done"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=128)
    email: str = Field(unique=True, index=True, max_length=256)
    hashed_password: str
    role: Role = Field(default=Role.student)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    tasks_created: list["Task"] = Relationship(back_populates="creator")
    evaluations: list["Evaluation"] = Relationship(back_populates="student")


class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=256)
    description: Optional[str] = Field(default=None)
    # Index into FIBONACCI (0-9) → weight 1, 1, 2, 3, 5, 8, 13, 21, 34, 55
    weight_index: int = Field(default=0, ge=0, le=9)
    status: TaskStatus = Field(default=TaskStatus.pending)
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    creator_id: int = Field(foreign_key="users.id")
    creator: Optional[User] = Relationship(back_populates="tasks_created")
    evaluations: list["Evaluation"] = Relationship(back_populates="task")

    @property
    def weight(self) -> int:
        return FIBONACCI[self.weight_index]


class Evaluation(SQLModel, table=True):
    __tablename__ = "evaluations"

    id: Optional[int] = Field(default=None, primary_key=True)
    grade: float = Field(ge=0.0, le=10.0)           # qualidade
    participation: float = Field(ge=0.0, le=10.0)   # engajamento / pontualidade
    feedback: Optional[str] = Field(default=None)
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)

    student_id: int = Field(foreign_key="users.id")
    task_id: int = Field(foreign_key="tasks.id")

    student: Optional[User] = Relationship(back_populates="evaluations")
    task: Optional[Task] = Relationship(back_populates="evaluations")
