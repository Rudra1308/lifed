import httpx
import json
from typing import List, Dict, Any, Optional, AsyncGenerator
from backend.app.config import settings
from backend.app.storage.repository import LifedRepository
from backend.app.ai.tools import LIFED_TOOLS, execute_tool

SYSTEM_PROMPT = """You are Lifed, a personal AI command center and decision-support assistant.
Your core mission is to help the user execute the highest-value work by connecting strategic goals, actionable tasks, deadlines, and saved durable memories.

Core loop: Understand → Remember → Plan → Decide → Execute → Learn.

Operating Principles:
1. Proactively use your tools (create_task, get_tasks, update_task, create_goal, get_goals, save_memory, search_memory, get_daily_plan) whenever the user expresses an intent to manage their work, remember preferences, or inspect priorities.
2. Ground all recommendations in data and explain your rationale clearly and concisely.
3. If the user tells you a preference (e.g. 'I prefer coding in the morning'), use save_memory to retain it for future planning.
4. If the user asks what to work on, inspect current tasks and active goals to formulate a prioritized response.
5. Keep your tone minimal, technical, clear, and proactive."""

class AIOrchestrator:
    def __init__(self, repo: LifedRepository, api_key: Optional[str] = None, model: Optional[str] = None):
        self.repo = repo
        user = repo.get_default_user()
        
        # Priority: explicitly passed key -> user SQLite key -> .env key
        self.api_key = api_key or user.custom_api_key or settings.openrouter_api_key
        # Priority: explicitly passed model -> user SQLite model -> .env default
        self.model = model or user.custom_model or settings.openrouter_default_model
        self.base_url = settings.openrouter_base_url.rstrip("/")

    async def chat(self, user_message: str, history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """Execute chat turn with multi-turn tool calling."""
        if not self.api_key:
            return {
                "reply": "⚠️ OpenRouter API key not configured. Please click 'SET AI KEY' in the top right to configure your key or set it in your .env file.",
                "tool_calls": [],
                "model": self.model
            }

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        executed_tools = []
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://github.com/lifed/lifed",
            "X-Title": "Lifed Command Center",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            payload = {
                "model": self.model,
                "messages": messages,
                "tools": LIFED_TOOLS,
                "tool_choice": "auto"
            }

            resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            if resp.status_code != 200:
                err_text = resp.text
                return {
                    "reply": f"OpenRouter API Error ({resp.status_code}): {err_text}",
                    "tool_calls": [],
                    "model": self.model
                }

            data = resp.json()
            choice = data["choices"][0]
            message_obj = choice["message"]

            # Check if LLM requested tool execution
            if message_obj.get("tool_calls"):
                messages.append(message_obj)

                for tc in message_obj["tool_calls"]:
                    tool_id = tc["id"]
                    func = tc["function"]
                    name = func["name"]
                    try:
                        args = json.loads(func["arguments"])
                    except Exception:
                        args = {}

                    result = execute_tool(name, args, self.repo)
                    executed_tools.append({
                        "name": name,
                        "arguments": args,
                        "result": result
                    })

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_id,
                        "name": name,
                        "content": json.dumps(result)
                    })

                # Follow-up request to get final assistant response
                followup_payload = {
                    "model": self.model,
                    "messages": messages
                }
                followup_resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=followup_payload)
                if followup_resp.status_code == 200:
                    followup_data = followup_resp.json()
                    final_reply = followup_data["choices"][0]["message"].get("content", "")
                else:
                    final_reply = f"Tools executed successfully: {', '.join([t['name'] for t in executed_tools])}"
            else:
                final_reply = message_obj.get("content", "")

            return {
                "reply": final_reply,
                "tool_calls": executed_tools,
                "model": self.model
            }
