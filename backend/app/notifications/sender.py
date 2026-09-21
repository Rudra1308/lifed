"""
Standalone CLI entrypoint to trigger the Lifed Morning Brief.
Usage:
    python -m backend.app.notifications.sender
Can be registered in Windows Task Scheduler or called via crontab/n8n.
"""
import asyncio
import sys
from backend.app.database import SessionLocal
from backend.app.storage.repository import LifedRepository
from backend.app.notifications.engine import dispatch_morning_digest

async def main():
    print("[LIFED] Triggering morning brief dispatcher...")
    db = SessionLocal()
    try:
        repo = LifedRepository(db)
        res = await dispatch_morning_digest(repo)
        print(f"[LIFED SUCCESS] {res}")
    except Exception as e:
        print(f"[LIFED ERROR] Failed to dispatch morning brief: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
