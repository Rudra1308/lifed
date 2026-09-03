from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.storage.repository import LifedRepository
from backend.app.schemas.schemas import GoalCreate, GoalUpdate, GoalRead

router = APIRouter(prefix="/api/goals", tags=["Goals"])

@router.get("", response_model=List[GoalRead])
def list_goals(status: Optional[str] = None, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    return repo.get_goals(status=status)

@router.post("", response_model=GoalRead)
def create_goal(payload: GoalCreate, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    return repo.create_goal(title=payload.title, description=payload.description, status=payload.status or "active")

@router.get("/{goal_id}", response_model=GoalRead)
def get_goal(goal_id: str, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    goal = repo.get_goal_by_id(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@router.patch("/{goal_id}", response_model=GoalRead)
def update_goal(goal_id: str, payload: GoalUpdate, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    goal = repo.update_goal(goal_id, **payload.model_dump(exclude_unset=True))
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@router.delete("/{goal_id}")
def delete_goal(goal_id: str, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    success = repo.delete_goal(goal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"success": True, "message": "Goal deleted"}
