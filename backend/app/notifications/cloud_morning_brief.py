"""
Lifed Cloud Morning Brief Runner
Runs directly inside GitHub Actions (or any cloud cron) without requiring a local database.
Reads state from lifed_sync_state.json and environment secrets.
"""
import os
import json
import random
import asyncio
from datetime import datetime
from pathlib import Path
import httpx

FALLBACK_QUOTES = [
    '"The impediment to action advances action. What stands in the way becomes the way." — Marcus Aurelius',
    '"We suffer more often in imagination than in reality." — Seneca',
    '"The man who loves walking will walk further than the man who loves the destination."',
    '"Discipline is choosing between what you want now and what you want most." — Abraham Lincoln',
    '"Concentrate all your thoughts upon the work in hand." — Alexander Graham Bell',
    '"First say to yourself what you would be; and then do what you have to do." — Epictetus',
]

async def generate_quote(example_quote: str, theme: str, gemini_key: str, openrouter_key: str) -> str:
    prompt = (
        f"You are a master philosophical advisor and performance coach.\n"
        f"The user loves this example quote:\n\"{example_quote}\"\n"
        f"Their desired theme/philosophy is: \"{theme}\".\n\n"
        f"Instructions:\n"
        f"1. Generate a single, punchy, profound motivational quote in the EXACT SAME stylistic cadence, tone, and spirit.\n"
        f"2. Keep it under 2 sentences.\n"
        f"3. Return ONLY the quote text (wrapped in quotes), with an optional concise attribution if fictional/historical. No other conversational words."
    )

    # Try Gemini if key available
    if gemini_key:
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(
                    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                    headers={"Authorization": f"Bearer {gemini_key}", "Content-Type": "application/json"},
                    json={
                        "model": "gemini-2.0-flash",
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
            print(f"[CLOUD LOG] Gemini quote generation skipped: {e}")

    # Try OpenRouter if key available
    if openrouter_key:
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openrouter_key}", "Content-Type": "application/json"},
                    json={
                        "model": "google/gemini-2.0-flash-exp:free",
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
            print(f"[CLOUD LOG] OpenRouter quote generation skipped: {e}")

    return random.choice(FALLBACK_QUOTES)


async def main():
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    openrouter_key = os.environ.get("OPENROUTER_API_KEY", "")

    if not token or not chat_id:
        print("[ERROR] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID secret in environment.")
        return

    # Load sync state
    sync_file = Path(__file__).resolve().parent.parent.parent.parent / "lifed_sync_state.json"
    state = {}
    if sync_file.exists():
        try:
            with open(sync_file, "r", encoding="utf-8") as f:
                state = json.load(f)
        except Exception as e:
            print(f"[WARNING] Could not read sync file: {e}")

    quote_config = state.get("quote_config", {})
    example_quote = quote_config.get("example_quote", "The impediment to action advances action. What stands in the way becomes the way.")
    quote_theme = quote_config.get("quote_theme", "Stoic resilience, focus, and relentless momentum")

    today_str = datetime.now().strftime("%A, %B %d, %Y")
    quote = await generate_quote(example_quote, quote_theme, gemini_key, openrouter_key)

    # Format goals
    goals = state.get("goals", [])
    goals_lines = [f"• *{g['title']}* ({int(round(g.get('progress', 0)))}%)" for g in goals[:4]]
    goals_text = "\n".join(goals_lines) if goals_lines else "• Keep advancing your core objectives"

    # Format projects
    projects = state.get("projects", [])
    proj_lines = [f"• *{p['title']}* [{p.get('completed_tasks', 0)}/{p.get('total_tasks', 0)} tasks]" for p in projects[:5]]
    proj_text = "\n".join(proj_lines) if proj_lines else "• All initiatives up to date"

    # Format tasks
    tasks = state.get("tasks", [])
    task_lines = []
    for t in tasks[:8]:
        priority = t.get("priority", "medium").lower()
        badge = "🔴 [URGENT]" if priority == "urgent" else "🟠 [HIGH]" if priority == "high" else "⚪ [MED]" if priority == "medium" else "🟢 [LOW]"
        dur = f" (~{t.get('estimated_duration')}m)" if t.get('estimated_duration') else ""
        dl = f" (Due: {t.get('deadline')})" if t.get('deadline') else ""
        task_lines.append(f"{badge} {t['title']}{dur}{dl}")
    tasks_text = "\n".join(task_lines) if task_lines else "✨ Zero pending tasks. Great day to plan high-impact goals!"

    # Assemble message
    message = (
        f"🌅 *LIFED MORNING COMMAND BRIEF*\n_{today_str}_\n\n"
        f"💡 *Quote of the Day*\n{quote}\n\n"
        f"🎯 *Strategic Goals*\n{goals_text}\n\n"
        f"📁 *Active Initiatives*\n{proj_text}\n\n"
        f"📋 *Today's Priority Tasks ({len(tasks)} pending)*\n{tasks_text}\n\n"
        f"⚡ _Delivered automatically by GitHub Actions cloud._"
    )

    # Send to Telegram
    url = f"https://api.telegram.org/bot{token.strip()}/sendMessage"
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(url, json={
            "chat_id": chat_id.strip(),
            "text": message,
            "parse_mode": "Markdown"
        })
        if res.status_code == 200:
            print("[SUCCESS] Morning brief successfully dispatched via Telegram!")
        else:
            # Fallback to plain text if Markdown had parsing issue
            plain_text = message.replace("*", "").replace("_", "")
            res2 = await client.post(url, json={
                "chat_id": chat_id.strip(),
                "text": plain_text
            })
            if res2.status_code == 200:
                print("[SUCCESS] Morning brief dispatched as plain text!")
            else:
                print(f"[ERROR] Failed to send Telegram message: {res2.text}")

if __name__ == "__main__":
    asyncio.run(main())
