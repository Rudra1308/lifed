import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.storage.repository import LifedRepository

client = TestClient(app)

def test_project_checkout_and_editing():
    db = SessionLocal()
    repo = LifedRepository(db)
    proj = repo.create_project(title="Test Project Checkout", description="Testing project checkout", status="active")
    db.close()

    # 1. Checkout (mark completed)
    res = client.patch(f"/api/projects/{proj.id}", json={"status": "completed"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"

    # 2. Edit project title and description
    res2 = client.patch(f"/api/projects/{proj.id}", json={"title": "Updated Project Title", "description": "Updated desc"})
    assert res2.status_code == 200
    assert res2.json()["title"] == "Updated Project Title"

    # Cleanup
    client.delete(f"/api/projects/{proj.id}")


def test_memory_patch_and_editing():
    # 1. Create memory
    res = client.post("/api/memories", json={"content": "Never schedule meetings before 10 AM", "type": "rule"})
    assert res.status_code == 200
    mem_id = res.json()["id"]

    # 2. Update memory content and category
    res2 = client.patch(f"/api/memories/{mem_id}", json={"content": "Never schedule meetings before 11 AM", "type": "rule"})
    assert res2.status_code == 200
    assert res2.json()["content"] == "Never schedule meetings before 11 AM"

    # Cleanup
    client.delete(f"/api/memories/{mem_id}")


def test_notification_settings_and_quote_preview():
    # 1. Update notification settings
    payload = {
        "enabled": True,
        "channel": "telegram",
        "time": "07:30",
        "example_quote": "We suffer more often in imagination than in reality. — Seneca",
        "quote_theme": "Stoic endurance and mental toughness",
        "telegram_bot_token": "123456:FAKE_TOKEN",
        "telegram_chat_id": "987654321"
    }
    res = client.post("/api/notifications/settings", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["enabled"] is True
    assert data["channel"] == "telegram"
    assert data["time"] == "07:30"
    assert data["example_quote"] == payload["example_quote"]

    # 2. Preview personalized quote
    res_quote = client.post("/api/notifications/preview-quote", json={
        "example_quote": payload["example_quote"],
        "quote_theme": payload["quote_theme"]
    })
    assert res_quote.status_code == 200
    assert "quote" in res_quote.json()
    assert len(res_quote.json()["quote"]) > 5
