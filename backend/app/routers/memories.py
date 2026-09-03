from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.storage.repository import LifedRepository
from backend.app.schemas.schemas import MemoryCreate, MemoryRead, MemorySearchResult
from backend.app.memory.service import memory_service

router = APIRouter(prefix="/api/memories", tags=["Memory"])

@router.get("", response_model=List[MemoryRead])
def list_memories(type: Optional[str] = None, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    return repo.get_memories(memory_type=type)

@router.post("", response_model=MemoryRead)
def create_memory(payload: MemoryCreate, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    mem = memory_service.create_memory(
        repo=repo,
        content=payload.content,
        memory_type=payload.type or "preference"
    )
    return mem

@router.get("/search")
def search_memories(
    q: str = Query(..., description="Query string to semantically match against stored memories"),
    db: Session = Depends(get_db)
):
    repo = LifedRepository(db)
    results = memory_service.search_memories(repo=repo, query=q)
    return [
        {
            "memory": {
                "id": item["memory"].id,
                "content": item["memory"].content,
                "type": item["memory"].type,
                "created_at": item["memory"].created_at,
            },
            "similarity": item["similarity"]
        }
        for item in results
    ]

@router.delete("/{memory_id}")
def delete_memory(memory_id: str, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    success = repo.delete_memory(memory_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"success": True, "message": "Memory deleted"}
