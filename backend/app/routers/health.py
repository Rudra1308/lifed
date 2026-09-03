from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
from backend.app.database import get_db
from backend.app.schemas.schemas import HealthStatus
from backend.app.config import settings

router = APIRouter(prefix="/api", tags=["Health"])

@router.get("/health", response_model=HealthStatus)
def health_check(db: Session = Depends(get_db)):
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return HealthStatus(
        status="ok",
        version=settings.version,
        app="Lifed",
        database=db_status,
        timestamp=datetime.now(timezone.utc).isoformat()
    )
