from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.storage.repository import LifedRepository
from backend.app.storage.sync import schedule_auto_sync_and_push
from backend.app.schemas.schemas import TaskCreate, TaskUpdate, TaskRead

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

@router.get("", response_model=List[TaskRead])
def list_tasks(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db)
):
    repo = LifedRepository(db)
    return repo.get_tasks(project_id=project_id, status=status, priority=priority)

@router.post("", response_model=TaskRead)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    task = repo.create_task(
        title=payload.title,
        project_id=payload.project_id,
        priority=payload.priority or "medium",
        deadline=payload.deadline,
        estimated_duration=payload.estimated_duration or 30,
        notes=payload.notes
    )
    schedule_auto_sync_and_push(repo)
    return task

@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: str, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    task = repo.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task_id: str, payload: TaskUpdate, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    task = repo.update_task(task_id, **payload.model_dump(exclude_unset=True))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    schedule_auto_sync_and_push(repo)
    return task

@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    success = repo.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    schedule_auto_sync_and_push(repo)
    return {"success": True, "message": "Task deleted"}
