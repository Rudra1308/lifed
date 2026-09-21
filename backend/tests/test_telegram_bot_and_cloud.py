import pytest
import asyncio
from backend.app.database import SessionLocal
from backend.app.storage.repository import LifedRepository
from backend.app.storage.sync import export_sync_state, SYNC_FILE_PATH
from backend.app.notifications.telegram_bot import handle_telegram_command
from backend.app.notifications.cloud_morning_brief import generate_quote

@pytest.mark.asyncio
async def test_telegram_commands():
    db = SessionLocal()
    repo = LifedRepository(db)

    token = "FAKE_TOKEN"
    chat_id = "123456"

    # 1. /help
    help_resp = await handle_telegram_command("/help", repo, token, chat_id)
    assert "Lifed AI Command Center" in help_resp
    assert "/tasks" in help_resp

    # 2. /task <title>
    create_resp = await handle_telegram_command("/task Telegram Automated Test Task", repo, token, chat_id)
    assert "Created task" in create_resp
    assert "Telegram Automated Test Task" in create_resp

    # 3. /tasks
    tasks_resp = await handle_telegram_command("/tasks", repo, token, chat_id)
    assert "Telegram Automated Test Task" in tasks_resp

    # 4. /done <title>
    done_resp = await handle_telegram_command("/done Telegram Automated Test Task", repo, token, chat_id)
    assert "marked as completed" in done_resp

    # 5. /projects
    proj_resp = await handle_telegram_command("/projects", repo, token, chat_id)
    assert "Active Initiatives" in proj_resp

    # 6. /goals
    goals_resp = await handle_telegram_command("/goals", repo, token, chat_id)
    assert "Strategic Goals" in goals_resp

    # 7. /quote
    quote_resp = await handle_telegram_command("/quote", repo, token, chat_id)
    assert "Quote" in quote_resp

    # Clean up test task
    all_tasks = repo.get_tasks()
    for t in all_tasks:
        if "Telegram Automated Test Task" in t.title:
            repo.delete_task(t.id)

    db.close()


def test_sync_state_export():
    db = SessionLocal()
    repo = LifedRepository(db)
    state = export_sync_state(repo)
    db.close()

    assert "last_synced" in state
    assert "goals" in state
    assert "projects" in state
    assert "tasks" in state
    assert "quote_config" in state
    assert SYNC_FILE_PATH.exists()


@pytest.mark.asyncio
async def test_cloud_quote_generation_fallback():
    quote = await generate_quote(
        example_quote="The impediment to action advances action.",
        theme="Stoic resilience",
        gemini_key="",
        openrouter_key=""
    )
    assert isinstance(quote, str)
    assert len(quote) > 10
