import httpx
import json
import logging
from typing import List, Dict, Any, Optional
from backend.app.config import settings
from backend.app.storage.repository import LifedRepository
from backend.app.ai.tools import LIFED_TOOLS, execute_tool
from backend.app.memory.service import memory_service

logger = logging.getLogger("lifed.ai")

SYSTEM_PROMPT = """You are Lifed, a personal AI command center and decision-support assistant.
Your mission is to help the user execute the highest-value work by connecting strategic goals, actionable tasks, deadlines, and saved durable memories.

Core loop: Understand → Remember → Plan → Decide → Execute → Learn.

Operating Principles:
1. Proactively execute tools (create_task, get_tasks, update_task, create_goal, get_goals, save_memory, search_memory, get_daily_plan) whenever the user expresses an intent to manage their work, remember preferences, or inspect priorities.
2. Ground all recommendations in data and explain your rationale clearly and concisely.
3. If the user expresses a preference or habit, retain it using save_memory.
4. Keep your tone minimal, technical, clear, and proactive."""

class HybridOrchestrator:
    def __init__(
        self,
        repo: LifedRepository,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        gemini_key: Optional[str] = None
    ):
        self.repo = repo
        user = repo.get_default_user()
        
        # Parse user preferences from SQLite
        prefs = {}
        if user.preferences:
            try:
                prefs = json.loads(user.preferences)
            except Exception:
                prefs = {}

        # Local Ollama config
        self.ollama_base_url = (prefs.get("ollama_base_url") or settings.ollama_base_url).rstrip("/")
        self.ollama_planner_model = prefs.get("ollama_planner_model") or settings.ollama_planner_model
        self.ollama_context_model = prefs.get("ollama_context_model") or settings.ollama_context_model

        # Google Gemini config
        self.gemini_api_key = gemini_key or prefs.get("gemini_api_key") or settings.gemini_api_key
        self.gemini_model = prefs.get("gemini_model") or settings.gemini_model
        self.gemini_base_url = settings.gemini_base_url.rstrip("/")

        # OpenRouter config
        self.openrouter_api_key = api_key or user.custom_api_key or settings.openrouter_api_key
        self.openrouter_model = model or user.custom_model or settings.openrouter_default_model
        self.openrouter_base_url = settings.openrouter_base_url.rstrip("/")

        # Orchestration mode: 'hybrid', 'local_only', 'cloud_only'
        self.mode = prefs.get("orchestration_mode") or settings.orchestration_mode

    async def check_ollama_available(self) -> bool:
        """Fast check to see if local Ollama daemon is running."""
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                res = await client.get(f"{self.ollama_base_url}/models")
                return res.status_code == 200
        except Exception:
            return False

    async def _extract_local_context(self, user_message: str, client: httpx.AsyncClient, ollama_ready: bool) -> str:
        """Agent 1: Uses Gemma (or local memory search) to assemble relevant context."""
        mem_results = memory_service.search_memories(self.repo, query=user_message, top_k=4)
        mem_texts = [f"- {m['memory'].content} (type: {m['memory'].type})" for m in mem_results]
        
        active_goals = self.repo.get_goals(status="active")[:3]
        goal_texts = [f"- {g.title} ({g.progress:.0f}% complete)" for g in active_goals]
        
        context_parts = []
        if mem_texts:
            context_parts.append("DURABLE MEMORIES:\n" + "\n".join(mem_texts))
        if goal_texts:
            context_parts.append("STRATEGIC GOALS:\n" + "\n".join(goal_texts))

        raw_context = "\n\n".join(context_parts)

        # If Ollama is running and mode allows, use Gemma for rapid context refinement
        if ollama_ready and self.mode != "cloud_only":
            try:
                gemma_payload = {
                    "model": self.ollama_context_model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a Context Specialist. Given the user input and raw retrieved records, summarize in 2-3 concise lines the most relevant constraints and priorities."
                        },
                        {
                            "role": "user",
                            "content": f"User query: {user_message}\n\nRetrieved context:\n{raw_context}"
                        }
                    ],
                    "temperature": 0.2
                }
                res = await client.post(f"{self.ollama_base_url}/chat/completions", json=gemma_payload, timeout=8.0)
                if res.status_code == 200:
                    summary = res.json()["choices"][0]["message"].get("content", "").strip()
                    if summary:
                        return f"[Context Agent ({self.ollama_context_model})]\n{summary}\n\n[Underlying Records]\n{raw_context}"
            except Exception as e:
                logger.debug(f"Gemma context extraction fallback: {e}")

        return raw_context

    async def _execute_tool_loop(
        self,
        messages: List[Dict[str, Any]],
        base_url: str,
        headers: Dict[str, str],
        model_name: str,
        client: httpx.AsyncClient
    ) -> tuple[Optional[str], List[Dict[str, Any]]]:
        """Execute standard OpenAI-compatible tool calling loop."""
        executed_tools = []
        payload = {
            "model": model_name,
            "messages": messages,
            "tools": LIFED_TOOLS,
            "tool_choice": "auto"
        }

        resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload, timeout=60.0)
        if resp.status_code != 200:
            return None, executed_tools

        data = resp.json()
        choice = data["choices"][0]
        message_obj = choice["message"]

        if message_obj.get("tool_calls"):
            messages.append(message_obj)
            for tc in message_obj["tool_calls"]:
                tool_id = tc.get("id", "call_1")
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

            followup = await client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json={"model": model_name, "messages": messages},
                timeout=60.0
            )
            if followup.status_code == 200:
                final_content = followup.json()["choices"][0]["message"].get("content", "")
                return final_content, executed_tools
            else:
                return f"Executed tools: {', '.join([t['name'] for t in executed_tools])}", executed_tools

        return message_obj.get("content", ""), executed_tools

    async def chat(self, user_message: str, history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """Execute collaborative multi-agent chat session."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            ollama_ready = await self.check_ollama_available()
            
            # Step 1: Extract Local Context (Gemma Agent / FastEmbed)
            context_dossier = await self._extract_local_context(user_message, client, ollama_ready)

            # Build conversation history
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            if context_dossier:
                messages.append({
                    "role": "system",
                    "content": f"RELEVANT LOCAL CONTEXT:\n{context_dossier}"
                })
            if history:
                messages.extend(history)
            messages.append({"role": "user", "content": user_message})

            executed_tools = []
            final_reply = ""
            active_model = ""
            agents_used = {}

            has_cloud = bool(self.gemini_api_key or self.openrouter_api_key)

            if self.mode == "hybrid" and ollama_ready and has_cloud:
                llama_headers = {"Content-Type": "application/json"}
                try:
                    reply, tools = await self._execute_tool_loop(
                        messages=messages.copy(),
                        base_url=self.ollama_base_url,
                        headers=llama_headers,
                        model_name=self.ollama_planner_model,
                        client=client
                    )
                    executed_tools = tools
                    agents_used["tools_agent"] = f"Local ({self.ollama_planner_model})"
                except Exception as e:
                    logger.warning(f"Llama3 local tool step failed: {e}")

                if self.gemini_api_key:
                    cloud_url = self.gemini_base_url
                    cloud_headers = {
                        "Authorization": f"Bearer {self.gemini_api_key}",
                        "Content-Type": "application/json"
                    }
                    cloud_model = self.gemini_model
                    provider_name = f"Google Gemini ({cloud_model})"
                else:
                    cloud_url = self.openrouter_base_url
                    cloud_headers = {
                        "Authorization": f"Bearer {self.openrouter_api_key}",
                        "HTTP-Referer": "https://github.com/lifed/lifed",
                        "X-Title": "Lifed Command Center",
                        "Content-Type": "application/json"
                    }
                    cloud_model = self.openrouter_model
                    provider_name = f"OpenRouter ({cloud_model})"

                cloud_reply, extra_tools = await self._execute_tool_loop(
                    messages=messages,
                    base_url=cloud_url,
                    headers=cloud_headers,
                    model_name=cloud_model,
                    client=client
                )
                if extra_tools:
                    executed_tools.extend(extra_tools)

                final_reply = cloud_reply or reply or "Plan coordinated successfully."
                active_model = f"Hybrid Mesh: {self.ollama_planner_model} + {cloud_model}"
                agents_used["synthesis_agent"] = provider_name
                agents_used["context_agent"] = f"Local ({self.ollama_context_model})"

            elif (self.mode == "local_only" or not has_cloud) and ollama_ready:
                llama_headers = {"Content-Type": "application/json"}
                reply, tools = await self._execute_tool_loop(
                    messages=messages,
                    base_url=self.ollama_base_url,
                    headers=llama_headers,
                    model_name=self.ollama_planner_model,
                    client=client
                )
                final_reply = reply or "Local agent loop completed."
                executed_tools = tools
                active_model = f"Local ({self.ollama_planner_model})"
                agents_used = {
                    "context_agent": f"Local ({self.ollama_context_model})",
                    "planner_agent": f"Local ({self.ollama_planner_model})"
                }

            elif has_cloud:
                if self.gemini_api_key:
                    cloud_url = self.gemini_base_url
                    cloud_headers = {
                        "Authorization": f"Bearer {self.gemini_api_key}",
                        "Content-Type": "application/json"
                    }
                    cloud_model = self.gemini_model
                    provider_label = f"Google Gemini ({cloud_model})"
                else:
                    cloud_url = self.openrouter_base_url
                    cloud_headers = {
                        "Authorization": f"Bearer {self.openrouter_api_key}",
                        "HTTP-Referer": "https://github.com/lifed/lifed",
                        "X-Title": "Lifed Command Center",
                        "Content-Type": "application/json"
                    }
                    cloud_model = self.openrouter_model
                    provider_label = f"OpenRouter ({cloud_model})"

                reply, tools = await self._execute_tool_loop(
                    messages=messages,
                    base_url=cloud_url,
                    headers=cloud_headers,
                    model_name=cloud_model,
                    client=client
                )
                final_reply = reply or "Cloud agent loop completed."
                executed_tools = tools
                active_model = provider_label
                agents_used = {"cloud_agent": provider_label}

            else:
                return {
                    "reply": (
                        "⚠️ **AI Models Not Connected**\n\n"
                        "Lifed is ready to orchestrate your command center! To activate:\n"
                        "1. **Local Mode ($0)**: Ensure Ollama is running (`ollama serve` with `llama3:latest` and `gemma4:e4b`).\n"
                        "2. **Cloud Mode**: Click **'SET AI KEY'** to add your Google Gemini or OpenRouter key.\n"
                        "3. **Hybrid Mode**: Connect both for collaborative on-device privacy + cloud strategy."
                    ),
                    "tool_calls": [],
                    "model": "offline",
                    "orchestration": {
                        "mode": self.mode,
                        "status": "waiting_for_connection"
                    }
                }

            return {
                "reply": final_reply,
                "tool_calls": executed_tools,
                "model": active_model,
                "orchestration": {
                    "mode": self.mode,
                    "agents": agents_used
                }
            }
