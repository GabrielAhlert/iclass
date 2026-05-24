from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db import get_session
from app.models import Task, User, Role
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.core.deps import get_current_user, require_role

router = APIRouter()


@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(Role.teacher, Role.admin)),
):
    task = Task(**data.model_dump(), creator_id=current_user.id)
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return TaskRead.from_orm_with_weight(task)


@router.get("/", response_model=list[TaskRead])
async def list_tasks(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    result = await session.exec(select(Task))
    return [TaskRead.from_orm_with_weight(t) for t in result.all()]


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: int,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    result = await session.exec(select(Task).where(Task.id == task_id))
    task = result.first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskRead.from_orm_with_weight(task)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int,
    data: TaskUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(Role.teacher, Role.admin)),
):
    result = await session.exec(select(Task).where(Task.id == task_id))
    task = result.first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.creator_id != current_user.id and current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Not your task")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(task, field, value)

    session.add(task)
    await session.commit()
    await session.refresh(task)
    return TaskRead.from_orm_with_weight(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(Role.teacher, Role.admin)),
):
    result = await session.exec(select(Task).where(Task.id == task_id))
    task = result.first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.creator_id != current_user.id and current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Not your task")

    await session.delete(task)
    await session.commit()
