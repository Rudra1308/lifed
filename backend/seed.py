from backend.app.database import engine, Base, SessionLocal
from backend.app.storage.repository import LifedRepository
from backend.app.memory.service import memory_service
from backend.app.planner.engine import daily_planner
from datetime import datetime, timedelta

def seed_database():
    print("[SEED] Resetting and seeding Lifed database...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    repo = LifedRepository(db)

    # 1. User
    user = repo.get_default_user()
    print(f"[SEED] Initialized user: {user.username}")

    # 2. Strategic Goals
    g1 = repo.create_goal(
        title="Master Autonomous AI Engineering",
        description="Build and deliver production-grade local-first agent systems with tool calling and vector retrieval.",
        status="active"
    )
    repo.update_goal(g1.id, progress=65.0)

    g2 = repo.create_goal(
        title="Launch Lifed Command Center",
        description="Deliver a polished portfolio project demonstrating Next.js, FastAPI, and custom kinetic physics.",
        status="active"
    )
    repo.update_goal(g2.id, progress=85.0)

    print(f"[SEED] Created 2 goals: '{g1.title}' and '{g2.title}'")

    # 3. Projects
    p1 = repo.create_project(
        title="Kinetic Matrix Visual System",
        goal_id=g2.id,
        description="Canvas-based dynamic particle lattice with theme-reactive physics.",
        status="active"
    )

    p2 = repo.create_project(
        title="Local Vector Memory Module",
        goal_id=g1.id,
        description="Embeddings pipeline running ONNX models locally for private semantic memory.",
        status="active"
    )

    p3 = repo.create_project(
        title="Autonomous Tool Orchestrator",
        goal_id=g1.id,
        description="Multi-turn tool-calling loop connecting LLM reasoning to SQLite DAO actions.",
        status="active"
    )
    print("[SEED] Created 3 projects.")

    # 4. Tasks
    today_str = datetime.now().strftime("%Y-%m-%d")
    tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    t1 = repo.create_task(
        title="Fine-tune kinetic matrix tension strands & pulse easing",
        project_id=p1.id,
        priority="urgent",
        estimated_duration=90,
        deadline=today_str,
        notes="Ensure 60 FPS performance during cursor shockwave interactions."
    )
    t2 = repo.create_task(
        title="Benchmark local ONNX embeddings cosine similarity",
        project_id=p2.id,
        priority="high",
        estimated_duration=45,
        deadline=today_str
    )
    t3 = repo.create_task(
        title="Document zero-config OpenRouter UI setup in README",
        project_id=p1.id,
        priority="high",
        estimated_duration=30,
        deadline=tomorrow_str
    )
    t4 = repo.create_task(
        title="Implement daily brief replanning heuristic",
        project_id=p3.id,
        priority="medium",
        estimated_duration=60
    )
    t5 = repo.create_task(
        title="Prepare Dark/Light theme comparison screenshots",
        project_id=p1.id,
        priority="medium",
        estimated_duration=40
    )
    t6 = repo.create_task(
        title="Review LLM system prompt for concise technical tone",
        project_id=p3.id,
        priority="low",
        estimated_duration=20
    )
    print("[SEED] Created 6 actionable tasks.")

    # 5. Durable Memories
    m1 = memory_service.create_memory(
        repo=repo,
        content="User prefers deep technical coding sessions in the morning from 9:00 AM to 12:00 PM.",
        memory_type="preference"
    )
    m2 = memory_service.create_memory(
        repo=repo,
        content="Strict boundary: do not schedule more than 4 hours of meetings per week to preserve flow state.",
        memory_type="rule"
    )
    m3 = memory_service.create_memory(
        repo=repo,
        content="Start each workday by reviewing Today's Priorities on the Lifed Command Center dashboard.",
        memory_type="routine"
    )
    m4 = memory_service.create_memory(
        repo=repo,
        content="Core portfolio stack: Next.js 14, TypeScript, Tailwind, FastAPI, SQLite, FastEmbed, and OpenRouter.",
        memory_type="fact"
    )
    print("[SEED] Stored 4 durable memories with local vector embeddings.")

    # 6. Generate Today's Plan
    plan = daily_planner.generate_plan(repo, target_hours=6.0)
    print(f"[SEED] Generated and saved Daily Plan for {plan['date']}: {len(plan['tasks'])} scheduled blocks.")

    db.close()
    print("[SEED] Database seeding complete! Ready for local execution.")

if __name__ == "__main__":
    seed_database()