from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.storage.repository import LifedRepository
from backend.app.storage.sync import schedule_auto_sync_and_push
from backend.app.schemas.schemas import ProjectCreate, ProjectUpdate, ProjectRead

router = APIRouter(prefix="/api/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectRead])
def list_projects(goal_id: Optional[str] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    return repo.get_projects(goal_id=goal_id, status=status)

@router.post("", response_model=ProjectRead)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    proj = repo.create_project(
        title=payload.title,
        goal_id=payload.goal_id,
        description=payload.description,
        status=payload.status or "active"
    )
    schedule_auto_sync_and_push(repo)
    return proj

@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: str, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    proj = repo.get_project_by_id(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj

@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(project_id: str, payload: ProjectUpdate, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    proj = repo.update_project(project_id, **payload.model_dump(exclude_unset=True))
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    schedule_auto_sync_and_push(repo)
    return proj

@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    success = repo.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    schedule_auto_sync_and_push(repo)
    return {"success": True, "message": "Project deleted"}
