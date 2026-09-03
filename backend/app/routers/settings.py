from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.storage.repository import LifedRepository
from backend.app.schemas.schemas import SettingsRead, SettingsUpdate
from backend.app.config import settings
import json

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("", response_model=SettingsRead)
def get_current_settings(db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    user = repo.get_default_user()
    
    # Determine API key source
    has_api_key = False
    source = "missing"
    if user.custom_api_key and user.custom_api_key.strip():
        has_api_key = True
        source = "custom"
    elif settings.openrouter_api_key and settings.openrouter_api_key.strip():
        has_api_key = True
        source = "env"
        
    current_model = user.custom_model or settings.openrouter_default_model

    return SettingsRead(
        has_api_key=has_api_key,
        api_key_source=source,
        current_model=current_model,
        default_model=settings.openrouter_default_model,
        database_url="sqlite:///./lifed.db"
    )

@router.post("", response_model=SettingsRead)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    user = repo.update_user_settings(
        api_key=payload.openrouter_api_key,
        model=payload.model
    )
    return get_current_settings(db)
