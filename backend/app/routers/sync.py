from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.storage.repository import LifedRepository
from backend.app.storage.sync import push_sync_state_immediately, get_sync_status

router = APIRouter(prefix="/api/sync", tags=["Sync"])


@router.get("/status")
def sync_status():
    """Get current cloud sync and auto-push status."""
    return get_sync_status()


@router.post("/push")
def sync_push(db: Session = Depends(get_db)):
    """Trigger immediate manual sync and git push to GitHub."""
    repo = LifedRepository(db)
    return push_sync_state_immediately(repo)
