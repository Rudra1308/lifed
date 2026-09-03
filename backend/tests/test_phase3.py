def test_goals_crud(client):
    # Create
    res = client.post("/api/goals", json={"title": "Master Distributed AI", "description": "Learn agent systems", "progress": 25.0})
    assert res.status_code == 200
    goal = res.json()
    assert goal["title"] == "Master Distributed AI"
    goal_id = goal["id"]

    # List
    list_res = client.get("/api/goals")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # Update
    patch_res = client.patch(f"/api/goals/{goal_id}", json={"progress": 50.0})
    assert patch_res.status_code == 200
    assert patch_res.json()["progress"] == 50.0

    # Delete
    del_res = client.delete(f"/api/goals/{goal_id}")
    assert del_res.status_code == 200

def test_projects_crud(client):
    # Create Goal first
    g_res = client.post("/api/goals", json={"title": "Infrastructure"})
    g_id = g_res.json()["id"]

    # Create Project
    p_res = client.post("/api/projects", json={"title": "Build FastAPI Engine", "goal_id": g_id})
    assert p_res.status_code == 200
    project = p_res.json()
    assert project["title"] == "Build FastAPI Engine"
    p_id = project["id"]

    # List
    list_res = client.get(f"/api/projects?goal_id={g_id}")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # Delete
    del_res = client.delete(f"/api/projects/{p_id}")
    assert del_res.status_code == 200

def test_tasks_and_dashboard(client):
    # Create Task
    t1 = client.post("/api/tasks", json={"title": "Implement Kinetic Matrix", "priority": "urgent", "estimated_duration": 45})
    assert t1.status_code == 200
    t2 = client.post("/api/tasks", json={"title": "Draft Architecture Diagram", "priority": "medium", "estimated_duration": 30})
    assert t2.status_code == 200

    # Test Dashboard summary
    d_res = client.get("/api/dashboard")
    assert d_res.status_code == 200
    dash = d_res.json()
    assert "greeting" in dash
    assert len(dash["top_priorities"]) == 2
    assert dash["top_priorities"][0]["priority"] == "urgent"
    assert dash["counts"]["total_tasks"] == 2
    assert dash["counts"]["pending_tasks"] == 2
