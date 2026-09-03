from backend.app.storage.repository import LifedRepository

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "Lifed"
    assert data["database"] == "connected"

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "Lifed"
    assert data["status"] == "online"

def test_storage_repository_and_settings(client, test_db):
    repo = LifedRepository(test_db)
    
    # Test User
    user = repo.get_default_user()
    assert user.username == "default_user"
    
    # Test Goal & Project & Task
    goal = repo.create_goal(title="Launch Lifed Portfolio", description="Build AI command center")
    assert goal.id is not None
    assert goal.title == "Launch Lifed Portfolio"

    proj = repo.create_project(title="Frontend & UI", goal_id=goal.id)
    assert proj.id is not None
    assert proj.goal_id == goal.id

    task = repo.create_task(title="Build Kinetic Matrix", project_id=proj.id, priority="high")
    assert task.id is not None
    assert task.status == "todo"

    # Test Memory
    mem = repo.create_memory(content="User prefers technical work in the morning", memory_type="routine")
    assert mem.id is not None
    assert mem.content == "User prefers technical work in the morning"

    # Test Settings API via client
    update_res = client.post("/api/settings", json={"openrouter_api_key": "test_key_123", "model": "google/gemini-2.0-flash-001"})
    assert update_res.status_code == 200
    settings_data = update_res.json()
    assert settings_data["has_api_key"] is True
    assert settings_data["api_key_source"] == "custom"
    assert settings_data["current_model"] == "google/gemini-2.0-flash-001"
