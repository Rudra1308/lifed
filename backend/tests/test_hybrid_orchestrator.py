import pytest
from backend.app.storage.repository import LifedRepository
from backend.app.ai.hybrid_orchestrator import HybridOrchestrator

def test_hybrid_orchestrator_initialization(test_db):
    repo = LifedRepository(test_db)
    orchestrator = HybridOrchestrator(
        repo=repo,
        api_key=None,
        model=None,
        gemini_key="test-gemini-key"
    )
    assert orchestrator.gemini_api_key == "test-gemini-key"
    assert orchestrator.ollama_planner_model == "llama3:latest"
    assert orchestrator.ollama_context_model == "gemma4:e4b"
    assert orchestrator.mode == "hybrid"

def test_settings_gemini_and_ollama(client):
    # Test GET settings includes new fields
    res = client.get("/api/settings")
    assert res.status_code == 200
    data = res.json()
    assert "ollama_planner_model" in data
    assert "ollama_context_model" in data
    assert "has_gemini_key" in data
    assert "orchestration_mode" in data

    # Test POST settings update
    update_res = client.post("/api/settings", json={
        "gemini_api_key": "test-key-123",
        "gemini_model": "gemini-2.0-flash",
        "orchestration_mode": "hybrid",
        "ollama_planner_model": "llama3:latest",
        "ollama_context_model": "gemma4:e4b"
    })
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["has_gemini_key"] is True
    assert updated["gemini_key_source"] == "custom"
    assert updated["gemini_model"] == "gemini-2.0-flash"
    assert updated["orchestration_mode"] == "hybrid"

@pytest.mark.asyncio
async def test_hybrid_orchestrator_offline_fallback(test_db):
    repo = LifedRepository(test_db)
    orchestrator = HybridOrchestrator(
        repo=repo,
        api_key="",
        model="",
        gemini_key=""
    )
    result = await orchestrator.chat("Hello test")
    assert "reply" in result
    assert "tool_calls" in result
    assert result["model"] in ["offline", "llama3:latest", "Local (llama3:latest)"]

