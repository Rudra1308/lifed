import json
import logging
import os
import subprocess
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from backend.app.storage.repository import LifedRepository

logger = logging.getLogger("lifed.sync")

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
SYNC_FILE_PATH = REPO_ROOT / "lifed_sync_state.json"

# State tracking for auto-push
_sync_lock = threading.Lock()
_debounce_timer: Optional[threading.Timer] = None
_last_push_status: Dict[str, Any] = {
    "last_synced": None,
    "last_pushed": None,
    "status": "idle",
    "error": None
}


def export_sync_state(repo: LifedRepository) -> Dict[str, Any]:
    """
    Export a lightweight, portable snapshot of pending tasks, active projects,
    strategic goals, quote history, and quote preferences to lifed_sync_state.json.
    """
    try:
        user = repo.get_default_user()
        prefs = {}
        if user.preferences:
            try:
                prefs = json.loads(user.preferences)
            except Exception:
                prefs = {}

        # Preserve existing quote history if present
        existing_history = []
        if SYNC_FILE_PATH.exists():
            try:
                with open(SYNC_FILE_PATH, "r", encoding="utf-8") as f:
                    old_state = json.load(f)
                    existing_history = old_state.get("quote_history", [])
            except Exception:
                existing_history = []

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

        now_iso = datetime.now().isoformat()
        state = {
            "last_synced": now_iso,
            "quote_config": {
                "example_quote": prefs.get("example_quote", "The impediment to action advances action. What stands in the way becomes the way. — Marcus Aurelius"),
                "quote_theme": prefs.get("quote_theme", "Stoic resilience, focus, and relentless momentum"),
                "custom_model": user.custom_model or "anthropic/claude-3.5-sonnet"
            },
            "quote_history": existing_history[-30:],
            "goals": goals_data,
            "projects": projects_data,
            "tasks": tasks_data
        }

        with open(SYNC_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2, ensure_ascii=False)

        _last_push_status["last_synced"] = now_iso
        logger.info(f"[SYNC] Exported sync state with {len(tasks_data)} tasks, {len(projects_data)} projects, {len(goals_data)} goals.")
        return state
    except Exception as e:
        logger.error(f"[SYNC] Failed to export sync state: {e}")
        return {}


def _execute_git_push():
    """Execute git add, commit, and push in background."""
    global _last_push_status
    with _sync_lock:
        try:
            _last_push_status["status"] = "pushing"
            # 1. Check if git repo exists
            git_dir = REPO_ROOT / ".git"
            if not git_dir.exists():
                logger.warning("[SYNC GIT] Not a git repository, skipping push.")
                _last_push_status["status"] = "idle"
                return

            # 2. Stage only lifed_sync_state.json
            subprocess.run(
                ["git", "add", "lifed_sync_state.json"],
                cwd=str(REPO_ROOT),
                check=True,
                capture_output=True,
                text=True
            )

            # 3. Check if there are staged changes to commit
            diff_res = subprocess.run(
                ["git", "diff", "--cached", "--name-only"],
                cwd=str(REPO_ROOT),
                capture_output=True,
                text=True
            )
            if "lifed_sync_state.json" not in diff_res.stdout:
                logger.info("[SYNC GIT] No state changes to commit.")
                _last_push_status["status"] = "idle"
                return

            # 4. Commit
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            commit_res = subprocess.run(
                ["git", "commit", "-m", f"sync: update lifed state ({now_str}) [skip ci]"],
                cwd=str(REPO_ROOT),
                capture_output=True,
                text=True
            )
            if commit_res.returncode != 0:
                logger.warning(f"[SYNC GIT] Git commit skipped or returned code {commit_res.returncode}: {commit_res.stderr}")

            # 5. Push to origin main
            push_res = subprocess.run(
                ["git", "push", "origin", "main"],
                cwd=str(REPO_ROOT),
                capture_output=True,
                text=True,
                timeout=30
            )
            if push_res.returncode == 0:
                now_pushed = datetime.now().isoformat()
                _last_push_status["last_pushed"] = now_pushed
                _last_push_status["status"] = "success"
                _last_push_status["error"] = None
                logger.info(f"[SYNC GIT] Successfully pushed lifed_sync_state.json to origin/main at {now_pushed}!")
            else:
                err_msg = push_res.stderr or push_res.stdout
                logger.warning(f"[SYNC GIT] Push returned non-zero code: {err_msg}")
                _last_push_status["status"] = "error"
                _last_push_status["error"] = err_msg.strip()
        except subprocess.TimeoutExpired:
            logger.error("[SYNC GIT] Push timed out after 30 seconds.")
            _last_push_status["status"] = "error"
            _last_push_status["error"] = "Git push timed out (network delay)."
        except Exception as e:
            logger.error(f"[SYNC GIT] Unexpected error during git push: {e}")
            _last_push_status["status"] = "error"
            _last_push_status["error"] = str(e)


def schedule_auto_sync_and_push(repo: LifedRepository, debounce_seconds: float = 4.0):
    """
    Debounced trigger: Immediately writes lifed_sync_state.json to disk,
    then schedules a background git commit & push after debounce_seconds of quiet.
    """
    global _debounce_timer

    # 1. Export state to disk immediately (instant)
    export_sync_state(repo)

    # 2. Debounce git push so rapid consecutive changes batch into 1 commit
    with _sync_lock:
        if _debounce_timer is not None:
            _debounce_timer.cancel()

        _debounce_timer = threading.Timer(debounce_seconds, _execute_git_push)
        _debounce_timer.daemon = True
        _debounce_timer.start()


def push_sync_state_immediately(repo: LifedRepository) -> Dict[str, Any]:
    """Manually trigger immediate sync and push without debouncing."""
    global _debounce_timer
    with _sync_lock:
        if _debounce_timer is not None:
            _debounce_timer.cancel()
            _debounce_timer = None

    export_sync_state(repo)
    _execute_git_push()
    return get_sync_status()


def get_sync_status() -> Dict[str, Any]:
    """Return status of sync and git push."""
    return {
        "last_synced": _last_push_status.get("last_synced"),
        "last_pushed": _last_push_status.get("last_pushed"),
        "status": _last_push_status.get("status", "idle"),
        "error": _last_push_status.get("error")
    }
