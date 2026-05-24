from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db import get_session
from app.models import Evaluation, User, Role, Task
from app.schemas.evaluation import EvaluationCreate, EvaluationRead, EvaluationUpdate
from app.core.deps import get_current_user, require_role

router = APIRouter()


@router.post("/", response_model=EvaluationRead, status_code=status.HTTP_201_CREATED)
async def create_evaluation(
    data: EvaluationCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(Role.teacher, Role.admin)),
):
    # Validate student exists
    student_result = await session.exec(select(User).where(User.id == data.student_id))
    if not student_result.first():
        raise HTTPException(status_code=404, detail="Student not found")

    # Validate task exists
    task_result = await session.exec(select(Task).where(Task.id == data.task_id))
    if not task_result.first():
        raise HTTPException(status_code=404, detail="Task not found")

    # Prevent duplicate evaluations for same student + task
    dup = await session.exec(
        select(Evaluation).where(
            Evaluation.student_id == data.student_id,
            Evaluation.task_id == data.task_id,
        )
    )
    if dup.first():
        raise HTTPException(status_code=409, detail="Evaluation already exists for this student/task")

    evaluation = Evaluation(**data.model_dump())
    session.add(evaluation)
    await session.commit()
    await session.refresh(evaluation)
    return evaluation


@router.get("/", response_model=list[EvaluationRead])
async def list_evaluations(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.student:
        result = await session.exec(
            select(Evaluation).where(Evaluation.student_id == current_user.id)
        )
    else:
        result = await session.exec(select(Evaluation))
    return result.all()


@router.get("/student/{student_id}", response_model=list[EvaluationRead])
async def get_student_evaluations(
    student_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(Role.teacher, Role.admin)),
):
    result = await session.exec(
        select(Evaluation).where(Evaluation.student_id == student_id)
    )
    return result.all()


@router.patch("/{evaluation_id}", response_model=EvaluationRead)
async def update_evaluation(
    evaluation_id: int,
    data: EvaluationUpdate,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_role(Role.teacher, Role.admin)),
):
    result = await session.exec(select(Evaluation).where(Evaluation.id == evaluation_id))
    evaluation = result.first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(evaluation, field, value)

    session.add(evaluation)
    await session.commit()
    await session.refresh(evaluation)
    return evaluation
