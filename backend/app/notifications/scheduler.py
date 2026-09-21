import asyncio
import json
import logging
from datetime import datetime
from backend.app.database import SessionLocal
from backend.app.storage.repository import LifedRepository
from backend.app.notifications.engine import dispatch_morning_digest

logger = logging.getLogger("lifed.scheduler")

_last_sent_date: str = ""
_scheduler_running: bool = False

async def morning_scheduler_loop():
    """Background worker that periodically checks if it's time to dispatch the morning brief."""
    global _last_sent_date, _scheduler_running
    _scheduler_running = True
    logger.info("[SCHEDULER] Morning notification scheduler initiated.")

    while _scheduler_running:
        try:
            now = datetime.now()
            today_str = now.strftime("%Y-%m-%d")
            current_time = now.strftime("%H:%M")

            # Open a short-lived DB session
            db = SessionLocal()
            try:
                repo = LifedRepository(db)
                user = repo.get_default_user()
                prefs = {}
                if user.preferences:
                    try:
                        prefs = json.loads(user.preferences)
                    except Exception:
                        prefs = {}

                enabled = prefs.get("notification_enabled", False)
                target_time = prefs.get("notification_time", "08:00")

                if enabled and current_time == target_time and _last_sent_date != today_str:
                    logger.info(f"[SCHEDULER] Triggering morning brief for {today_str} at {current_time}...")
                    try:
                        res = await dispatch_morning_digest(repo, prefs)
                        _last_sent_date = today_str
                        logger.info(f"[SCHEDULER] Morning brief sent successfully: {res}")
                    except Exception as err:
                        logger.error(f"[SCHEDULER] Failed to deliver morning brief: {err}")
            finally:
                db.close()

        except Exception as e:
            logger.error(f"[SCHEDULER] Error in scheduler loop: {e}")

        # Sleep for 30 seconds before next check
        await asyncio.sleep(30)

def stop_scheduler():
    global _scheduler_running
    _scheduler_running = False
