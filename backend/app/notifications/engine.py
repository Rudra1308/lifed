import json
import logging
import random
import smtplib
import urllib.parse
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, Optional, List

import httpx

from backend.app.config import settings
from backend.app.storage.repository import LifedRepository

logger = logging.getLogger("lifed.notifications")

# Curated high-impact quotes matching different philosophies as offline failsafe
FALLBACK_QUOTES = {
    "stoic": [
        '"The impediment to action advances action. What stands in the way becomes the way." — Marcus Aurelius',
        '"We suffer more often in imagination than in reality." — Seneca',
        '"First say to yourself what you would be; and then do what you have to do." — Epictetus',
        '"Waste no more time arguing about what a good man should be. Be one." — Marcus Aurelius',
        '"You have power over your mind - not outside events. Realize this, and you will find strength." — Marcus Aurelius',
    ],
    "discipline": [
        '"The man who loves walking will walk further than the man who loves the destination."',
        '"Discipline is choosing between what you want now and what you want most." — Abraham Lincoln',
        '"Small disciplines repeated with consistency every day lead to great achievements slowly over time." — John C. Maxwell',
        '"We don\'t rise to the level of our expectations, we fall to the level of our training." — Archilochus',
    ],
    "focus": [
        '"Deep work is the ability to focus without distraction on a cognitively demanding task." — Cal Newport',
        '"Concentrate all your thoughts upon the work in hand. The sun\'s rays do not burn until brought to a focus." — Alexander Graham Bell',
        '"Simplicity boils down to two steps: Identify the essential. Eliminate the rest." — Leo Babauta',
    ],
    "action": [
        '"Do not wait; the time will never be \'just right\'. Start where you stand, and work with whatever tools you may have." — George Herbert',
        '"Action is the foundational key to all success." — Pablo Picasso',
        '"Knowing is not enough; we must apply. Willing is not enough; we must do." — Johann Wolfgang von Goethe',
    ]
}


async def generate_personalized_quote(
    example_quote: Optional[str],
    theme: Optional[str],
    repo: LifedRepository
) -> str:
    """
    Generate an inspiring quote matching the user's example quote style and tone.
    Uses free Gemini 2.0 Flash, local Ollama, or OpenRouter; falls back to curated bank.
    """
    user = repo.get_default_user()
    prefs = {}
    if user.preferences:
        try:
            prefs = json.loads(user.preferences)
        except Exception:
            prefs = {}

    example = (example_quote or prefs.get("example_quote") or "").strip()
    quote_theme = (theme or prefs.get("quote_theme") or "Stoic resilience, focus, and relentless momentum").strip()

    prompt = (
        f"You are a master philosophical advisor and performance coach.\n"
        f"The user loves this example quote:\n\"{example or 'The impediment to action advances action. What stands in the way becomes the way.'}\"\n"
        f"Their desired theme/philosophy is: \"{quote_theme}\".\n\n"
        f"Instructions:\n"
        f"1. Generate a single, punchy, profound motivational quote in the EXACT SAME stylistic cadence, tone, and spirit.\n"
        f"2. Keep it under 2 sentences.\n"
        f"3. Return ONLY the quote text (wrapped in quotes), with an optional concise attribution if fictional/historical. No other conversational words."
    )

    # 1. Try Google Gemini (Free tier)
    gemini_key = prefs.get("gemini_api_key") or settings.gemini_api_key
    if gemini_key:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{settings.gemini_base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {gemini_key}", "Content-Type": "application/json"},
                    json={
                        "model": prefs.get("gemini_model") or settings.gemini_model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7,
                        "max_tokens": 100,
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    quote = data["choices"][0]["message"]["content"].strip()
                    if quote:
                        return quote
        except Exception as e:
            logger.warning(f"Gemini quote generation failed: {e}")

    # 2. Try OpenRouter (if user has key or free models)
    openrouter_key = user.custom_api_key or settings.openrouter_api_key
    if openrouter_key:
        try:
            model = user.custom_model or settings.openrouter_default_model
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{settings.openrouter_base_url.rstrip('/')}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openrouter_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://github.com/lifed/lifed",
                        "X-Title": "Lifed Morning Digest"
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7,
                        "max_tokens": 100,
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    quote = data["choices"][0]["message"]["content"].strip()
                    if quote:
                        return quote
        except Exception as e:
            logger.warning(f"OpenRouter quote generation failed: {e}")

    # 3. Try Local Ollama (100% Free Offline)
    ollama_url = (prefs.get("ollama_base_url") or settings.ollama_base_url).rstrip("/")
    ollama_model = prefs.get("ollama_planner_model") or settings.ollama_planner_model
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.post(
                f"{ollama_url}/chat/completions",
                json={
                    "model": ollama_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                    "max_tokens": 100,
                }
            )
            if res.status_code == 200:
                data = res.json()
                quote = data["choices"][0]["message"]["content"].strip()
                if quote:
                    return quote
    except Exception:
        pass

    # 4. Offline Fallback selection
    theme_lower = quote_theme.lower()
    for cat, quotes in FALLBACK_QUOTES.items():
        if cat in theme_lower:
            return random.choice(quotes)

    all_quotes = [q for group in FALLBACK_QUOTES.values() for q in group]
    return random.choice(all_quotes)


async def build_morning_digest(
    repo: LifedRepository,
    prefs: Optional[dict] = None,
    custom_quote: Optional[str] = None
) -> Dict[str, Any]:
    """
    Synthesize daily morning digest text containing:
    - Personalized quote of the day
    - Strategic goals & progress
    - Active projects status
    - Pending priority tasks and deadlines
    """
    if prefs is None:
        user = repo.get_default_user()
        if user.preferences:
            try:
                prefs = json.loads(user.preferences)
            except Exception:
                prefs = {}
        else:
            prefs = {}

    today_dt = datetime.now()
    date_str = today_dt.strftime("%A, %B %d, %Y")

    # 1. Quote
    quote = custom_quote
    if not quote and prefs.get("include_quote", True):
        quote = await generate_personalized_quote(
            example_quote=prefs.get("example_quote"),
            theme=prefs.get("quote_theme"),
            repo=repo
        )

    # 2. Strategic Goals
    goals_text_md = ""
    if prefs.get("include_goals", True):
        goals = repo.get_goals(status="active")
        if goals:
            goals_lines = []
            for g in goals[:4]:
                progress_int = int(round(g.progress or 0))
                goals_lines.append(f"• *{g.title}* ({progress_int}%)")
            goals_text_md = "\n".join(goals_lines)

    # 3. Active Projects
    projects_text_md = ""
    if prefs.get("include_projects", True):
        projects = repo.get_projects(status="active")
        tasks = repo.get_tasks()
        if projects:
            proj_lines = []
            for p in projects[:5]:
                proj_tasks = [t for t in tasks if t.project_id == p.id]
                done_tasks = [t for t in proj_tasks if t.status == "completed"]
                proj_lines.append(f"• *{p.title}* [{len(done_tasks)}/{len(proj_tasks)} done]")
            projects_text_md = "\n".join(proj_lines)

    # 4. Priority Pending Tasks
    tasks_text_md = ""
    pending_tasks = []
    if prefs.get("include_tasks", True):
        all_tasks = repo.get_tasks()
        pending_tasks = [t for t in all_tasks if t.status != "completed"]

        # Sort: urgent > high > medium > low
        priority_ranks = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        pending_tasks.sort(key=lambda t: priority_ranks.get(t.priority.lower(), 2))

        if pending_tasks:
            t_lines = []
            for t in pending_tasks[:8]:
                badge = "🔴 [URGENT]" if t.priority == "urgent" else "🟠 [HIGH]" if t.priority == "high" else "⚪ [MED]" if t.priority == "medium" else "🟢 [LOW]"
                deadline_info = f" (Due: {t.deadline})" if t.deadline else ""
                dur_info = f" (~{t.estimated_duration}m)" if t.estimated_duration else ""
                t_lines.append(f"{badge} {t.title}{dur_info}{deadline_info}")
            tasks_text_md = "\n".join(t_lines)

    # Construct clean Markdown message
    sections = [f"🌅 *LIFED MORNING COMMAND BRIEF*\n_{date_str}_\n"]

    if quote:
        sections.append(f"💡 *Quote of the Day*\n{quote}\n")

    if goals_text_md:
        sections.append(f"🎯 *Strategic Goals*\n{goals_text_md}\n")

    if projects_text_md:
        sections.append(f"📁 *Active Initiatives*\n{projects_text_md}\n")

    if tasks_text_md:
        sections.append(f"📋 *Today's Priority Tasks ({len(pending_tasks)} pending)*\n{tasks_text_md}\n")
    else:
        sections.append("📋 *Today's Priority Tasks*\n✨ Zero pending tasks. Great time to plan strategic goals!\n")

    sections.append("⚡ _Focus on what moves the needle today._")
    markdown_body = "\n".join(sections)

    # Plain text version
    plain_body = markdown_body.replace("*", "").replace("_", "")

    # HTML version
    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0c0c0e; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
      <h2 style="margin-top: 0; color: #ffffff; border-bottom: 1px solid #27272a; padding-bottom: 12px;">🌅 Lifed Morning Brief</h2>
      <p style="color: #a1a1aa; font-size: 14px;">{date_str}</p>
      
      {f'<blockquote style="border-left: 3px solid #3b82f6; margin: 16px 0; padding: 8px 16px; background-color: #18181b; color: #e4e4e7; font-style: italic;">{quote}</blockquote>' if quote else ''}
      
      {f'<h3 style="color: #ffffff; font-size: 16px; margin-top: 24px;">🎯 Strategic Goals</h3><div style="color: #d4d4d8; font-size: 14px;">{goals_text_md.replace(chr(10), "<br>").replace("*", "<b>").replace("•", "&bull;")}</div>' if goals_text_md else ''}
      
      {f'<h3 style="color: #ffffff; font-size: 16px; margin-top: 24px;">📁 Active Initiatives</h3><div style="color: #d4d4d8; font-size: 14px;">{projects_text_md.replace(chr(10), "<br>").replace("*", "<b>").replace("•", "&bull;")}</div>' if projects_text_md else ''}
      
      <h3 style="color: #ffffff; font-size: 16px; margin-top: 24px;">📋 Priority Tasks ({len(pending_tasks)} pending)</h3>
      <div style="color: #d4d4d8; font-size: 14px; line-height: 1.6;">
        {tasks_text_md.replace(chr(10), "<br>") if tasks_text_md else "No pending tasks."}
      </div>
      
      <p style="margin-top: 28px; font-size: 12px; color: #71717a; border-top: 1px solid #27272a; padding-top: 12px;">
        Sent automatically by your personal Lifed Command Center.
      </p>
    </div>
    """

    return {
        "date": date_str,
        "quote": quote,
        "markdown": markdown_body,
        "plain": plain_body,
        "html": html_body,
        "pending_count": len(pending_tasks)
    }


# ================= Senders =================

async def send_telegram(token: str, chat_id: str, message_markdown: str) -> Dict[str, Any]:
    """Send message via Telegram Bot API (100% free, no credit card, instant push)."""
    if not token or not chat_id:
        raise ValueError("Telegram bot token and chat ID are required.")

    clean_token = token.strip()
    clean_chat_id = chat_id.strip()
    url = f"https://api.telegram.org/bot{clean_token}/sendMessage"

    async with httpx.AsyncClient(timeout=15.0) as client:
        # First attempt with Markdown
        res = await client.post(url, json={
            "chat_id": clean_chat_id,
            "text": message_markdown,
            "parse_mode": "Markdown"
        })
        if res.status_code == 200:
            return {"success": True, "channel": "telegram", "message": "Telegram message sent successfully."}

        # Fallback to plain text if Markdown format had parse error
        plain_text = message_markdown.replace("*", "").replace("_", "")
        res2 = await client.post(url, json={
            "chat_id": clean_chat_id,
            "text": plain_text
        })
        if res2.status_code == 200:
            return {"success": True, "channel": "telegram", "message": "Telegram message sent (plain text format)."}

        err = res2.json().get("description", res2.text)
        raise RuntimeError(f"Telegram API error: {err}")


async def send_discord(webhook_url: str, message_markdown: str) -> Dict[str, Any]:
    """Send message via Discord Webhook (100% free)."""
    if not webhook_url:
        raise ValueError("Discord webhook URL is required.")

    # Discord max message size is 2000 chars
    content = message_markdown[:1980]
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(webhook_url.strip(), json={"content": content})
        if res.status_code in [200, 204]:
            return {"success": True, "channel": "discord", "message": "Discord message posted successfully."}
        raise RuntimeError(f"Discord Webhook error: status {res.status_code} - {res.text}")


async def send_whatsapp(
    phone: Optional[str],
    apikey: Optional[str],
    message: str,
    webhook_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send message to WhatsApp.
    Supports either:
    1. Local/cloud n8n or custom webhook if webhook_url is provided.
    2. Free CallMeBot gateway API if phone & apikey are provided.
    """
    # 1. Custom / n8n Webhook (as mentioned in project notes)
    if webhook_url and webhook_url.strip():
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                webhook_url.strip(),
                json={"phone": phone, "message": message, "type": "lifed_morning_brief"}
            )
            if res.status_code in [200, 201, 204]:
                return {"success": True, "channel": "whatsapp_webhook", "message": "Webhook triggered successfully (n8n/custom)."}
            raise RuntimeError(f"WhatsApp Webhook error: status {res.status_code} - {res.text}")

    # 2. CallMeBot API
    if not phone or not apikey:
        raise ValueError("WhatsApp phone number and CallMeBot API key (or custom webhook URL) are required.")

    encoded_text = urllib.parse.quote(message.replace("*", "").replace("_", ""))
    callmebot_url = f"https://api.callmebot.com/whatsapp.php?phone={phone.strip()}&text={encoded_text}&apikey={apikey.strip()}"

    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.get(callmebot_url)
        if res.status_code == 200:
            return {"success": True, "channel": "whatsapp", "message": "WhatsApp message dispatched via CallMeBot."}
        raise RuntimeError(f"CallMeBot error: {res.text}")


def send_email_smtp(
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_pass: str,
    to_email: str,
    subject: str,
    body_plain: str,
    body_html: str
) -> Dict[str, Any]:
    """Send email via standard SMTP (e.g. Gmail App Password at $0 cost)."""
    if not to_email or not smtp_user or not smtp_pass:
        raise ValueError("Recipient email, SMTP username, and password are required.")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = to_email

    part1 = MIMEText(body_plain, "plain")
    part2 = MIMEText(body_html, "html")
    msg.attach(part1)
    msg.attach(part2)

    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, to_email, msg.as_string())

    return {"success": True, "channel": "email", "message": f"Email delivered to {to_email} successfully."}


async def dispatch_morning_digest(
    repo: LifedRepository,
    prefs: Optional[dict] = None,
    channel_override: Optional[str] = None
) -> Dict[str, Any]:
    """Orchestrate digest creation and sending to the chosen free channel."""
    if prefs is None:
        user = repo.get_default_user()
        if user.preferences:
            try:
                prefs = json.loads(user.preferences)
            except Exception:
                prefs = {}
        else:
            prefs = {}

    digest = await build_morning_digest(repo, prefs)
    channel = channel_override or prefs.get("notification_channel", "telegram")

    if channel == "telegram":
        token = prefs.get("telegram_bot_token")
        chat_id = prefs.get("telegram_chat_id")
        return await send_telegram(token, chat_id, digest["markdown"])

    elif channel == "discord":
        webhook_url = prefs.get("discord_webhook_url")
        return await send_discord(webhook_url, digest["markdown"])

    elif channel == "whatsapp":
        phone = prefs.get("whatsapp_phone")
        apikey = prefs.get("whatsapp_apikey")
        webhook_url = prefs.get("webhook_url")
        return await send_whatsapp(phone, apikey, digest["markdown"], webhook_url=webhook_url)

    elif channel == "email":
        host = prefs.get("smtp_host") or "smtp.gmail.com"
        port = int(prefs.get("smtp_port") or 587)
        user = prefs.get("smtp_user")
        pwd = prefs.get("smtp_pass")
        to = prefs.get("email_to")
        subject = f"🌅 Lifed Morning Brief — {digest['date']}"
        return send_email_smtp(host, port, user, pwd, to, subject, digest["plain"], digest["html"])

    else:
        raise ValueError(f"Unsupported notification channel: '{channel}'")
