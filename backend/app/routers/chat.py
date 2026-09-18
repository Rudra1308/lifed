from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from typing import Optional
from backend.app.database import get_db
from backend.app.storage.repository import LifedRepository
from backend.app.schemas.schemas import ChatRequest
from backend.app.ai.hybrid_orchestrator import HybridOrchestrator


router = APIRouter(prefix="/api/chat", tags=["AI Chat"])

@router.post("")
async def chat_message(
    payload: ChatRequest,
    x_openrouter_key: Optional[str] = Header(None, alias="X-OpenRouter-Key"),
    x_openrouter_model: Optional[str] = Header(None, alias="X-OpenRouter-Model"),
    x_gemini_key: Optional[str] = Header(None, alias="X-Gemini-Key"),
    db: Session = Depends(get_db)
):
    repo = LifedRepository(db)
    api_key = x_openrouter_key or payload.api_key
    model = x_openrouter_model or payload.model

    orchestrator = HybridOrchestrator(
        repo=repo,
        api_key=api_key,
        model=model,
        gemini_key=x_gemini_key
    )
    result = await orchestrator.chat(user_message=payload.message)
    return result

