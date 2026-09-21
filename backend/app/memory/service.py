import json
from typing import List, Dict, Any, Optional
from backend.app.storage.repository import LifedRepository
from backend.app.memory.embeddings import embedding_engine
from backend.app.models.models import Memory

class MemoryService:
    @staticmethod
    def create_memory(repo: LifedRepository, content: str, memory_type: str = "preference") -> Memory:
        vector = embedding_engine.embed_text(content)
        embedding_json = json.dumps(vector)
        return repo.create_memory(
            content=content,
            memory_type=memory_type,
            embedding=embedding_json
        )

    @staticmethod
    def search_memories(repo: LifedRepository, query: str, top_k: int = 5, min_score: float = 0.05) -> List[Dict[str, Any]]:
        query_vector = embedding_engine.embed_text(query)
        all_memories = repo.get_memories()

        scored_results = []
        for mem in all_memories:
            similarity = 0.0
            if mem.embedding:
                try:
                    stored_vector = json.loads(mem.embedding)
                    similarity = embedding_engine.cosine_similarity(query_vector, stored_vector)
                except Exception:
                    # Text fallback
                    similarity = 0.5 if query.lower() in mem.content.lower() else 0.0
            else:
                similarity = 0.5 if query.lower() in mem.content.lower() else 0.0

            if similarity >= min_score or (query.lower() in mem.content.lower()):
                scored_results.append({
                    "memory": mem,
                    "similarity": round(float(similarity), 4)
                })

        scored_results.sort(key=lambda x: x["similarity"], reverse=True)
        return scored_results[:top_k]

    @staticmethod
    def update_memory(repo: LifedRepository, memory_id: str, content: Optional[str] = None, memory_type: Optional[str] = None) -> Optional[Memory]:
        update_data: Dict[str, Any] = {}
        if memory_type is not None:
            update_data["type"] = memory_type
        if content is not None:
            update_data["content"] = content
            vector = embedding_engine.embed_text(content)
            update_data["embedding"] = json.dumps(vector)
        return repo.update_memory(memory_id, **update_data)

memory_service = MemoryService()
