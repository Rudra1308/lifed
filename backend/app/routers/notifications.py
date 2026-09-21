import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.storage.repository import LifedRepository
from backend.app.schemas.schemas import (
    NotificationSettings,
    NotificationSettingsUpdate,
    NotificationTestRequest,
    QuotePreviewRequest,
)
from backend.app.notifications.engine import (
    generate_personalized_quote,
    dispatch_morning_digest,
    build_morning_digest,
)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

def _get_notification_prefs(user) -> dict:
    if not user.preferences:
        return {}
    try:
        return json.loads(user.preferences)
    except Exception:
        return {}

@router.get("/settings", response_model=NotificationSettings)
def get_notification_settings(db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    user = repo.get_default_user()
    prefs = _get_notification_prefs(user)
    
    return NotificationSettings(
        enabled=prefs.get("notification_enabled", False),
        channel=prefs.get("notification_channel", "telegram"),
        time=prefs.get("notification_time", "08:00"),
        telegram_bot_token=prefs.get("telegram_bot_token"),
        telegram_chat_id=prefs.get("telegram_chat_id"),
        discord_webhook_url=prefs.get("discord_webhook_url"),
        whatsapp_phone=prefs.get("whatsapp_phone"),
        whatsapp_apikey=prefs.get("whatsapp_apikey"),
        webhook_url=prefs.get("webhook_url"),
        email_to=prefs.get("email_to"),
        smtp_host=prefs.get("smtp_host", "smtp.gmail.com"),
        smtp_port=prefs.get("smtp_port", 587),
        smtp_user=prefs.get("smtp_user"),
        smtp_pass=prefs.get("smtp_pass"),
        example_quote=prefs.get("example_quote", "The impediment to action advances action. What stands in the way becomes the way. — Marcus Aurelius"),
        quote_theme=prefs.get("quote_theme", "Stoic resilience, focus, and relentless momentum"),
        include_tasks=prefs.get("include_tasks", True),
        include_projects=prefs.get("include_projects", True),
        include_goals=prefs.get("include_goals", True),
        include_quote=prefs.get("include_quote", True),
    )

@router.post("/settings", response_model=NotificationSettings)
def update_notification_settings(payload: NotificationSettingsUpdate, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    
    prefs_update = {}
    if payload.enabled is not None:
        prefs_update["notification_enabled"] = payload.enabled
    if payload.channel is not None:
        prefs_update["notification_channel"] = payload.channel
    if payload.time is not None:
        prefs_update["notification_time"] = payload.time
    if payload.telegram_bot_token is not None:
        prefs_update["telegram_bot_token"] = payload.telegram_bot_token.strip()
    if payload.telegram_chat_id is not None:
        prefs_update["telegram_chat_id"] = payload.telegram_chat_id.strip()
    if payload.discord_webhook_url is not None:
        prefs_update["discord_webhook_url"] = payload.discord_webhook_url.strip()
    if payload.whatsapp_phone is not None:
        prefs_update["whatsapp_phone"] = payload.whatsapp_phone.strip()
    if payload.whatsapp_apikey is not None:
        prefs_update["whatsapp_apikey"] = payload.whatsapp_apikey.strip()
    if payload.webhook_url is not None:
        prefs_update["webhook_url"] = payload.webhook_url.strip()
    if payload.email_to is not None:
        prefs_update["email_to"] = payload.email_to.strip()
    if payload.smtp_host is not None:
        prefs_update["smtp_host"] = payload.smtp_host.strip()
    if payload.smtp_port is not None:
        prefs_update["smtp_port"] = payload.smtp_port
    if payload.smtp_user is not None:
        prefs_update["smtp_user"] = payload.smtp_user.strip()
    if payload.smtp_pass is not None:
        prefs_update["smtp_pass"] = payload.smtp_pass.strip()
    if payload.example_quote is not None:
        prefs_update["example_quote"] = payload.example_quote.strip()
    if payload.quote_theme is not None:
        prefs_update["quote_theme"] = payload.quote_theme.strip()
    if payload.include_tasks is not None:
        prefs_update["include_tasks"] = payload.include_tasks
    if payload.include_projects is not None:
        prefs_update["include_projects"] = payload.include_projects
    if payload.include_goals is not None:
        prefs_update["include_goals"] = payload.include_goals
    if payload.include_quote is not None:
        prefs_update["include_quote"] = payload.include_quote

    repo.update_user_settings(preferences=prefs_update)
    return get_notification_settings(db)

@router.post("/preview-quote")
async def preview_quote(payload: QuotePreviewRequest, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    quote = await generate_personalized_quote(
        example_quote=payload.example_quote,
        theme=payload.quote_theme,
        repo=repo
    )
    return {"quote": quote}

@router.post("/test")
async def test_notification(payload: NotificationTestRequest, db: Session = Depends(get_db)):
    repo = LifedRepository(db)
    try:
        res = await dispatch_morning_digest(repo=repo, channel_override=payload.channel)
        return {"success": True, "detail": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/trigger-morning")
async def trigger_morning(db: Session = Depends(get_db)):
    """External webhook trigger (e.g. for n8n or Windows Task Scheduler)."""
    repo = LifedRepository(db)
    try:
        res = await dispatch_morning_digest(repo=repo)
        return {"success": True, "result": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
