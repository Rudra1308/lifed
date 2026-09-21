import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any
from backend.app.storage.repository import LifedRepository

logger = logging.getLogger("lifed.sync")

SYNC_FILE_PATH = Path(__file__).resolve().parent.parent.parent.parent / "lifed_sync_state.json"

def export_sync_state(repo: LifedRepository) -> Dict[str, Any]:
    """
    Export a lightweight, portable snapshot of pending tasks, active projects,
    strategic goals, and quote preferences to lifed_sync_state.json.
    This file is used by the GitHub Actions cloud scheduler when the laptop is off.
    """
    try:
        user = repo.get_default_user()
        prefs = {}
        if user.preferences:
            try:
                prefs = json.loads(user.preferences)
            except Exception:
                prefs = {}

        # 1. Goals
        goals = repo.get_goals(status="active")
        goals_data = [
            {"id": g.id, "title": g.title, "progress": g.progress, "status": g.status}
            for g in goals
        ]

        # 2. Projects
        projects = repo.get_projects(status="active")
        all_tasks = repo.get_tasks()
        projects_data = []
        for p in projects:
            p_tasks = [t for t in all_tasks if t.project_id == p.id]
            p_done = [t for t in p_tasks if t.status == "completed"]
            projects_data.append({
                "id": p.id,
                "title": p.title,
                "status": p.status,
                "total_tasks": len(p_tasks),
                "completed_tasks": len(p_done)
            })

        # 3. Pending Tasks
        pending_tasks = [t for t in all_tasks if t.status != "completed"]
        priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        pending_tasks.sort(key=lambda t: priority_order.get(t.priority.lower(), 2))

        tasks_data = [
            {
                "id": t.id,
                "title": t.title,
                "priority": t.priority,
                "estimated_duration": t.estimated_duration,
                "deadline": t.deadline,
                "status": t.status
            }
            for t in pending_tasks
        ]

        state = {
            "last_synced": datetime.now().isoformat(),
            "quote_config": {
                "example_quote": prefs.get("example_quote", "The impediment to action advances action. What stands in the way becomes the way. — Marcus Aurelius"),
                "quote_theme": prefs.get("quote_theme", "Stoic resilience, focus, and relentless momentum")
            },
            "goals": goals_data,
            "projects": projects_data,
            "tasks": tasks_data
        }

        with open(SYNC_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2, ensure_ascii=False)

        logger.info(f"[SYNC] Exported sync state with {len(tasks_data)} tasks, {len(projects_data)} projects, {len(goals_data)} goals.")
        return state
    except Exception as e:
        logger.error(f"[SYNC] Failed to export sync state: {e}")
        return {}
