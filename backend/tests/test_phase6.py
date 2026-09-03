from backend.app.storage.repository import LifedRepository
from backend.app.planner.engine import daily_planner

def test_daily_planner_ranking_and_rationale(test_db):
    repo = LifedRepository(test_db)

    # 1. Add preference memory
    repo.create_memory(
        content="User prefers technical work in the morning",
        memory_type="preference"
    )

    # 2. Add goal and project
    goal = repo.create_goal(title="Launch AI Agent Portfolio")
    proj = repo.create_project(title="Lifed Command Center", goal_id=goal.id)

    # 3. Add tasks
    t_urgent = repo.create_task(
        title="Complete memory embeddings module",
        project_id=proj.id,
        priority="urgent",
        estimated_duration=90
    )
    t_medium = repo.create_task(
        title="Update documentation",
        project_id=proj.id,
        priority="medium",
        estimated_duration=30
    )
    t_low = repo.create_task(
        title="Browse design inspiration",
        priority="low",
        estimated_duration=45
    )

    # 4. Generate plan
    plan = daily_planner.generate_plan(repo, target_hours=4.0)

    assert plan["id"] is not None
    assert len(plan["tasks"]) >= 2
    assert plan["tasks"][0]["id"] == t_urgent.id
    assert "09:00" in plan["tasks"][0]["scheduled_time"]
    assert "URGENT" in plan["tasks"][0]["rationale"]
    assert "morning deep technical work" in plan["tasks"][0]["rationale"]
    assert "Synthesized" in plan["rationale"]

def test_daily_plan_endpoints(client, test_db):
    repo = LifedRepository(test_db)
    repo.create_task(title="Deploy to Vercel", priority="high", estimated_duration=60)

    # GET today's plan
    res = client.get("/api/plan/today")
    assert res.status_code == 200
    plan_data = res.json()
    assert "tasks" in plan_data
    assert "rationale" in plan_data
    assert len(plan_data["tasks"]) >= 1

    # POST generate new plan with constraint
    gen_res = client.post("/api/plan/generate", json={"target_hours": 3.0})
    assert gen_res.status_code == 200
    assert gen_res.json()["date"] == plan_data["date"]

    # POST replan
    replan_res = client.post("/api/plan/replan", json={"target_hours": 5.0})
    assert replan_res.status_code == 200
