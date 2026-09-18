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
    
    # User preferences
    prefs = {}
    if user.preferences:
        try:
            prefs = json.loads(user.preferences)
        except Exception:
            prefs = {}

    # Determine OpenRouter API key source
    has_api_key = False
    source = "missing"
    if user.custom_api_key and user.custom_api_key.strip():
        has_api_key = True
        source = "custom"
    elif settings.openrouter_api_key and settings.openrouter_api_key.strip():
        has_api_key = True
        source = "env"
        
    current_model = user.custom_model or settings.openrouter_default_model

    # Determine Gemini API key source
    custom_gemini_key = prefs.get("gemini_api_key", "")
    has_gemini_key = False
    gemini_source = "missing"
    if custom_gemini_key and custom_gemini_key.strip():
        has_gemini_key = True
        gemini_source = "custom"
    elif settings.gemini_api_key and settings.gemini_api_key.strip():
        has_gemini_key = True
        gemini_source = "env"

    return SettingsRead(
        has_api_key=has_api_key,
        api_key_source=source,
        current_model=current_model,
        default_model=settings.openrouter_default_model,
        database_url="sqlite:///./lifed.db",
        has_gemini_key=has_gemini_key,
        gemini_key_source=gemini_source,
        gemini_model=prefs.get("gemini_model") or settings.gemini_model,
        ollama_base_url=prefs.get("ollama_base_url") or settings.ollama_base_url,
        ollama_planner_model=prefs.get("ollama_planner_model") or settings.ollama_planner_model,
        ollama_context_model=prefs.get("ollama_context_model") or settings.ollama_context_model,
        orchestration_mode=prefs.get("orchestration_mode") or settings.orchestration_mode,
    )

@router.post("", response_model=SettingsRead)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    
    # Collect preferences to update
    prefs_to_update = {}
    if payload.gemini_api_key is not None:
        prefs_to_update["gemini_api_key"] = payload.gemini_api_key.strip()
    if payload.gemini_model is not None:
        prefs_to_update["gemini_model"] = payload.gemini_model.strip()
    if payload.ollama_base_url is not None:
        prefs_to_update["ollama_base_url"] = payload.ollama_base_url.strip()
    if payload.ollama_planner_model is not None:
        prefs_to_update["ollama_planner_model"] = payload.ollama_planner_model.strip()
    if payload.ollama_context_model is not None:
        prefs_to_update["ollama_context_model"] = payload.ollama_context_model.strip()
    if payload.orchestration_mode is not None:
        prefs_to_update["orchestration_mode"] = payload.orchestration_mode.strip()

    repo.update_user_settings(
        api_key=payload.openrouter_api_key,
        model=payload.model,
        preferences=prefs_to_update if prefs_to_update else None
    )
    return get_current_settings(db)

