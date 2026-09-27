"""
Standalone CLI entrypoint to trigger the Lifed Morning Brief.
Usage:
    python -m backend.app.notifications.sender [--force]
Can be registered in Windows Task Scheduler or called via crontab/n8n.
"""
import asyncio
import json
import sys
from datetime import datetime, timezone, timedelta
from backend.app.database import SessionLocal
from backend.app.storage.repository import LifedRepository
from backend.app.notifications.engine import dispatch_morning_digest
from backend.app.storage.sync import schedule_auto_sync_and_push

async def main():
    print("[LIFED] Triggering morning brief dispatcher...")
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

        # Use IST (UTC+5:30) date
        ist = timezone(timedelta(hours=5, minutes=30))
        today_str = datetime.now(ist).strftime("%Y-%m-%d")

        force = "--force" in sys.argv
        if not force and prefs.get("last_brief_sent_date") == today_str:
            print(f"[LIFED] Morning brief already dispatched today ({today_str}). Exiting. (Use --force to resend)")
            return

        res = await dispatch_morning_digest(repo)
        print(f"[LIFED SUCCESS] {res}")

        # Update last sent date in local user preferences and push sync state
        prefs["last_brief_sent_date"] = today_str
        repo.update_user_settings(preferences=prefs)
        schedule_auto_sync_and_push(repo)

    except Exception as e:
        print(f"[LIFED ERROR] Failed to dispatch morning brief: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
