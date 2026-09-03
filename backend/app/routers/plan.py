from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from backend.app.database import get_db
from backend.app.storage.repository import LifedRepository
from backend.app.planner.engine import daily_planner
import json

router = APIRouter(prefix="/api/plan", tags=["Daily Plan"])

class GeneratePlanRequest(BaseModel):
    target_hours: Optional[float] = 6.0
    prioritize_goal_id: Optional[str] = None

@router.get("/today")
def get_today_plan(db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    date_str = datetime.now().strftime("%Y-%m-%d")
    plan = repo.get_daily_plan(date_str)
    
    if not plan:
        return daily_planner.generate_plan(repo)

    return {
        "id": plan.id,
        "date": plan.date,
        "tasks": json.loads(plan.tasks or "[]"),
        "rationale": plan.rationale,
        "created_at": plan.created_at.isoformat() if plan.created_at else None
    }

@router.post("/generate")
def generate_new_plan(payload: GeneratePlanRequest, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    return daily_planner.generate_plan(
        repo=repo,
        target_hours=payload.target_hours or 6.0,
        prioritize_goal_id=payload.prioritize_goal_id
    )

@router.post("/replan")
def replan_day(payload: GeneratePlanRequest, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    return daily_planner.generate_plan(
        repo=repo,
        target_hours=payload.target_hours or 6.0,
        prioritize_goal_id=payload.prioritize_goal_id
    )
