import pytest
from backend.app.storage.repository import LifedRepository
from backend.app.ai.tools import execute_tool, LIFED_TOOLS
from backend.app.ai.orchestrator import AIOrchestrator

def test_tool_definitions_validity():
    assert len(LIFED_TOOLS) >= 8
    tool_names = [t["function"]["name"] for t in LIFED_TOOLS]
    assert "create_task" in tool_names
    assert "get_tasks" in tool_names
    assert "update_task" in tool_names
    assert "create_goal" in tool_names
    assert "save_memory" in tool_names
    assert "search_memory" in tool_names
    assert "get_daily_plan" in tool_names

def test_tool_execution(test_db):
    repo = LifedRepository(test_db)

    # 1. Create Task tool
    res = execute_tool("create_task", {"title": "Deploy Lifed v1", "priority": "urgent", "estimated_duration": 45}, repo)
    assert res["success"] is True
    assert res["task"]["title"] == "Deploy Lifed v1"
    task_id = res["task"]["id"]

    # 2. Get Tasks tool
    get_res = execute_tool("get_tasks", {"priority": "urgent"}, repo)
    assert get_res["success"] is True
    assert get_res["count"] == 1

    # 3. Update Task tool
    upd_res = execute_tool("update_task", {"task_id": task_id, "status": "completed"}, repo)
    assert upd_res["success"] is True
    assert upd_res["task"]["status"] == "completed"

    # 4. Create Goal tool
    goal_res = execute_tool("create_goal", {"title": "Learn AI Engineering"}, repo)
    assert goal_res["success"] is True

    # 5. Save & Search Memory tool
    mem_res = execute_tool("save_memory", {"content": "User prefers technical work in the morning", "type": "routine"}, repo)
    assert mem_res["success"] is True

    search_res = execute_tool("search_memory", {"query": "morning"}, repo)
    assert search_res["success"] is True
    assert search_res["count"] == 1
    assert "morning" in search_res["memories"][0]["content"]

def test_chat_without_api_key(client):
    res = client.post("/api/chat", json={"message": "What should I work on today?"})
    assert res.status_code == 200
    data = res.json()
    assert "OpenRouter API key not configured" in data["reply"]
