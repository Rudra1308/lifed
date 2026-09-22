import asyncio
import json
import logging
from typing import Optional, Dict, Any

import httpx

from backend.app.database import SessionLocal
from backend.app.storage.repository import LifedRepository
from backend.app.storage.sync import schedule_auto_sync_and_push
from backend.app.notifications.engine import build_morning_digest, generate_personalized_quote, send_telegram
from backend.app.ai.hybrid_orchestrator import HybridOrchestrator

logger = logging.getLogger("lifed.telegram_bot")

_bot_running: bool = False

HELP_MESSAGE = (
    "👋 *Lifed AI Command Center — Mobile Assistant*\n\n"
    "You can manage your tasks, projects, goals, and durable memory directly from Telegram:\n\n"
    "⚡ *Quick Commands:*\n"
    "• `/tasks` — View all pending priority tasks\n"
    "• `/projects` — View active initiatives & completion stats\n"
    "• `/goals` — View strategic north-star goals\n"
    "• `/done <title or id>` — Mark a task or project as completed\n"
    "• `/task <title>` — Quickly create a task\n"
    "• `/brief` — View today's intelligent daily schedule & brief\n"
    "• `/quote` — Generate a personalized motivational quote\n\n"
    "🧠 *Natural Language AI Control:*\n"
    "You can also simply text me normally:\n"
    "• _\"Add urgent task to finish client proposal by tomorrow\"_\n"
    "• _\"Mark project make lifed version 3.0 completed\"_\n"
    "• _\"Remember rule: No meetings on Wednesday mornings\"_\n"
    "• _\"What are my top priorities right now?\"_\n"
)




def _complete_matching_item(query: str, repo: LifedRepository) -> str:
    """Find and mark completed any matching task or project."""
    cleaned = query.strip()
    lower = cleaned.lower()

    # Strip prefixes/suffixes
    for word in ["project", "task", "mark", "as", "completed", "complete", "done", "accomplished", "the"]:
        # Match standalone words
        import re
        lower = re.sub(rf"\b{word}\b", " ", lower).strip()

    all_projects = repo.get_projects(status="active")
    all_tasks = [t for t in repo.get_tasks() if t.status != "completed"]

    # If query is empty and there is only 1 active project, complete it
    if not lower and len(all_projects) == 1:
        p = all_projects[0]
        repo.update_project(p.id, status="completed")
        schedule_auto_sync_and_push(repo)
        return f"✅ *Accomplished!* Project *'{p.title}'* has been marked as completed."

    # If numeric (e.g. "1" or "2"), match against pending tasks
    if lower.isdigit():
        idx = int(lower) - 1
        priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        all_tasks.sort(key=lambda t: priority_order.get(t.priority.lower(), 2))
        if 0 <= idx < len(all_tasks):
            task = all_tasks[idx]
            repo.update_task(task.id, status="completed")
            schedule_auto_sync_and_push(repo)
            return f"✅ Task *'{task.title}'* marked as completed!"

    # 1. Search projects by title substring or words
    if lower:
        for p in all_projects:
            p_lower = p.title.lower()
            if lower in p_lower or p_lower in lower:
                repo.update_project(p.id, status="completed")
                schedule_auto_sync_and_push(repo)
                return f"✅ *Accomplished!* Project *'{p.title}'* has been marked as completed."

        # Word overlap match (e.g. "lifed version 3.0" in "make lifed version 3.0")
        query_words = set(w for w in lower.split() if len(w) > 1)
        if query_words:
            for p in all_projects:
                p_words = set(w for w in p.title.lower().split() if len(w) > 1)
                if query_words.issubset(p_words) or len(query_words.intersection(p_words)) >= 2:
                    repo.update_project(p.id, status="completed")
                    schedule_auto_sync_and_push(repo)
                    return f"✅ *Accomplished!* Project *'{p.title}'* has been marked as completed."

    # 2. Search tasks by title substring or words
    if lower:
        for t in all_tasks:
            t_lower = t.title.lower()
            if lower in t_lower or t_lower in lower:
                repo.update_task(t.id, status="completed")
                schedule_auto_sync_and_push(repo)
                return f"✅ Task *'{t.title}'* marked as completed!"

        query_words = set(w for w in lower.split() if len(w) > 1)
        if query_words:
            for t in all_tasks:
                t_words = set(w for w in t.title.lower().split() if len(w) > 1)
                if query_words.issubset(t_words) or len(query_words.intersection(t_words)) >= 2:
                    repo.update_task(t.id, status="completed")
                    schedule_auto_sync_and_push(repo)
                    return f"✅ Task *'{t.title}'* marked as completed!"

    return f"❓ Could not find any active task or project matching *'{cleaned or query}'*.\nUse `/tasks` or `/projects` to see active items."


async def handle_telegram_command(
    text: str,
    repo: LifedRepository,
    token: str,
    chat_id: str
) -> str:
    """Process an incoming Telegram message and execute the appropriate action."""
    cleaned = text.strip()
    lower = cleaned.lower()

    # 1. Help & Start
    if lower in ["/start", "/help", "help", "/commands", "commands"]:
        return HELP_MESSAGE

    # 2. View Tasks
    elif lower in ["/tasks", "/todo", "tasks", "todo", "/task"]:
        tasks = [t for t in repo.get_tasks() if t.status != "completed"]
        priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        tasks.sort(key=lambda t: priority_order.get(t.priority.lower(), 2))

        if not tasks:
            return "✨ *Zero pending tasks!* All caught up. Use `/add <title>` to create new work."

        lines = [f"📋 *Pending Tasks ({len(tasks)} items):*\n"]
        for idx, t in enumerate(tasks, 1):
            badge = "🔴 [URGENT]" if t.priority == "urgent" else "🟠 [HIGH]" if t.priority == "high" else "⚪ [MED]" if t.priority == "medium" else "🟢 [LOW]"
            dl = f" (Due: {t.deadline})" if t.deadline else ""
            dur = f" ~{t.estimated_duration}m" if t.estimated_duration else ""
            lines.append(f"{idx}. {badge} *{t.title}*{dur}{dl}")

        lines.append("\n💡 _Tip: Reply `/done <number or title>` to mark completed._")
        return "\n".join(lines)

    # 3. View Projects
    elif lower in ["/projects", "projects", "/project"]:
        projects = repo.get_projects(status="active")
        tasks = repo.get_tasks()
        if not projects:
            return "📁 No active projects currently. Add one in the app or send: _'create project <name>'_."

        lines = [f"📁 *Active Initiatives ({len(projects)}):*\n"]
        for p in projects:
            p_tasks = [t for t in tasks if t.project_id == p.id]
            done_tasks = [t for t in p_tasks if t.status == "completed"]
            pct = int(round((len(done_tasks) / len(p_tasks)) * 100)) if p_tasks else 0
            lines.append(f"• *{p.title}* — {pct}% ({len(done_tasks)}/{len(p_tasks)} tasks done)")

        lines.append("\n💡 _Tip: Reply `/done <project name>` or `/project complete <name>` to mark a project completed._")
        return "\n".join(lines)

    # 4. View Goals
    elif lower in ["/goals", "goals", "/goal"]:
        goals = repo.get_goals(status="active")
        if not goals:
            return "🎯 No active goals defined yet."

        lines = [f"🎯 *Strategic Goals ({len(goals)}):*\n"]
        for g in goals:
            lines.append(f"• *{g.title}* — {int(round(g.progress or 0))}%")
        return "\n".join(lines)

    # 5. Project Subcommands (/project complete ..., /project add ...)
    elif lower.startswith("/project ") or lower.startswith("project "):
        cmd_rest = cleaned.split(" ", 1)[1].strip()
        cmd_lower = cmd_rest.lower()

        if cmd_lower.startswith("complete") or cmd_lower.startswith("done"):
            query = cmd_rest.split(" ", 1)[1].strip() if " " in cmd_rest else ""
            return _complete_matching_item(query, repo)
        elif cmd_lower.startswith("add ") or cmd_lower.startswith("create "):
            title = cmd_rest.split(" ", 1)[1].strip()
            proj = repo.create_project(title=title)
            schedule_auto_sync_and_push(repo)
            return f"📁 *Created project:* *'{proj.title}'*."
        else:
            return _complete_matching_item(cmd_rest, repo)

    # 6. Task Subcommands (/task add ..., /task complete ...)
    elif lower.startswith("/task ") or lower.startswith("task "):
        cmd_rest = cleaned.split(" ", 1)[1].strip()
        cmd_lower = cmd_rest.lower()

        if cmd_lower.startswith("complete") or cmd_lower.startswith("done"):
            query = cmd_rest.split(" ", 1)[1].strip() if " " in cmd_rest else ""
            return _complete_matching_item(query, repo)
        elif cmd_lower.startswith("add ") or cmd_lower.startswith("create "):
            title = cmd_rest.split(" ", 1)[1].strip()
            task = repo.create_task(title=title, priority="medium", estimated_duration=30)
            schedule_auto_sync_and_push(repo)
            return f"✅ Created task: *{task.title}* (Medium priority, ~30m)."
        else:
            # Assume /task <title> is adding a task
            task = repo.create_task(title=cmd_rest, priority="medium", estimated_duration=30)
            schedule_auto_sync_and_push(repo)
            return f"✅ Created task: *{task.title}* (Medium priority, ~30m)."

    # 7. Quick Add Task (/add <title>)
    elif lower.startswith("/add ") or lower.startswith("add task "):
        title = cleaned.split(" ", 1)[1].strip()
        if lower.startswith("add task "):
            title = cleaned[len("add task "):].strip()
        task = repo.create_task(title=title, priority="medium", estimated_duration=30)
        schedule_auto_sync_and_push(repo)
        return f"✅ Created task: *{task.title}* (Medium priority, ~30m)."

    # 8. Completion Intent Matching:
    # Matches:
    # "mark lifed version 3.0 complete"
    # "mark project lifed version 3.0 as completed"
    # "/done ..."
    # "done ..."
    # "complete ..."
    elif (
        lower.startswith("mark ")
        or lower.startswith("/done")
        or lower.startswith("done ")
        or lower.startswith("/complete")
        or lower.startswith("complete ")
        or lower.startswith("/finish")
        or lower.startswith("finish ")
        or " complete" in lower
        or " completed" in lower
        or " done" in lower
    ):
        result = _complete_matching_item(cleaned, repo)
        if result and "❓" not in result:
            return result
        # If no direct match, allow AI to process below
        pass

    # 9. Daily Brief
    if lower in ["/brief", "brief"]:
        digest = await build_morning_digest(repo)
        return digest["markdown"]

    # 10. Motivational Quote
    elif lower in ["/quote", "quote"]:
        user = repo.get_default_user()
        prefs = json.loads(user.preferences) if user.preferences else {}
        quote = await generate_personalized_quote(
            example_quote=prefs.get("example_quote"),
            theme=prefs.get("quote_theme"),
            repo=repo
        )
        return f"💡 *Personalized Daily Quote:*\n{quote}"

    # 11. Natural Language AI Assistant
    try:
        orchestrator = HybridOrchestrator(repo)
        result = await orchestrator.chat(cleaned)
        schedule_auto_sync_and_push(repo)
        reply = result.get("reply", "")
        tool_calls = result.get("tool_calls", [])
        if tool_calls:
            tool_msgs = []
            for tc in tool_calls:
                res = tc.get("result", {})
                if isinstance(res, dict) and "message" in res:
                    tool_msgs.append(res["message"])
            if tool_msgs and (not reply or "Plan coordinated successfully" in reply):
                return "✅ " + "\n".join(tool_msgs)
        return reply or "Action executed successfully."
    except Exception as e:
        logger.error(f"[TELEGRAM AI ERROR] {e}")
        return f"⚠️ Error processing command: {e}"


async def telegram_bot_polling_loop():
    """Background long-polling worker to receive messages from Telegram and respond."""
    global _bot_running
    _bot_running = True
    last_offset = 0

    logger.info("[TELEGRAM BOT] Interactive 2-way Telegram bot worker starting...")

    while _bot_running:
        try:
            db = SessionLocal()
            try:
                repo = LifedRepository(db)
                user = repo.get_default_user()
                prefs = json.loads(user.preferences) if user.preferences else {}

                token = prefs.get("telegram_bot_token")
                authorized_chat_id = str(prefs.get("telegram_chat_id") or "").strip()
            finally:
                db.close()

            # If no Telegram configured, sleep and retry
            if not token or not authorized_chat_id:
                await asyncio.sleep(10)
                continue

            # Poll for updates
            url = f"https://api.telegram.org/bot{token.strip()}/getUpdates"
            params = {"timeout": 15, "offset": last_offset}

            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.get(url, params=params)

                if res.status_code == 200:
                    data = res.json()
                    updates = data.get("result", [])

                    for update in updates:
                        last_offset = update["update_id"] + 1

                        if "message" in update and "text" in update["message"]:
                            msg = update["message"]
                            sender_chat_id = str(msg["chat"]["id"]).strip()
                            text = msg["text"].strip()

                            # Security Gate: only process authorized user
                            if sender_chat_id != authorized_chat_id:
                                logger.warning(f"[TELEGRAM BOT] Ignored message from unauthorized chat_id: {sender_chat_id}")
                                continue

                            logger.info(f"[TELEGRAM BOT] Received message: '{text}'")

                            # Execute command with fresh DB session
                            db_turn = SessionLocal()
                            try:
                                repo_turn = LifedRepository(db_turn)
                                reply_text = await handle_telegram_command(text, repo_turn, token, sender_chat_id)
                                await send_telegram(token, sender_chat_id, reply_text)
                            except Exception as err:
                                logger.error(f"[TELEGRAM BOT] Error handling command: {err}")
                                try:
                                    await send_telegram(token, sender_chat_id, f"⚠️ Error: {err}")
                                except Exception:
                                    pass
                            finally:
                                db_turn.close()

                elif res.status_code == 401:
                    logger.warning("[TELEGRAM BOT] Invalid Bot Token. Retrying in 30s...")
                    await asyncio.sleep(30)
                else:
                    await asyncio.sleep(5)

        except httpx.RequestError:
            # Network blip or offline
            await asyncio.sleep(8)
        except Exception as e:
            logger.error(f"[TELEGRAM BOT] Exception in polling loop: {e}")
            await asyncio.sleep(10)

    logger.info("[TELEGRAM BOT] Bot worker stopped.")


def stop_telegram_bot():
    global _bot_running
    _bot_running = False
