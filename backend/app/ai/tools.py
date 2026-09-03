from typing import Dict, Any, List
from backend.app.storage.repository import LifedRepository
from backend.app.memory.service import memory_service

LIFED_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Create a new task in Lifed with priority, estimated duration, and optional deadline.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Clear actionable title for the task."},
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "urgent"],
                        "description": "Task priority level. Default is medium."
                    },
                    "estimated_duration": {
                        "type": "integer",
                        "description": "Estimated time to complete in minutes (e.g., 30, 60, 120)."
                    },
                    "deadline": {
                        "type": "string",
                        "description": "Optional deadline date formatted as YYYY-MM-DD."
                    },
                    "notes": {"type": "string", "description": "Optional details or context."}
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_tasks",
            "description": "Retrieve tasks from Lifed, optionally filtered by status or priority.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["todo", "in_progress", "completed"],
                        "description": "Filter by task completion status."
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "urgent"],
                        "description": "Filter by priority level."
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_task",
            "description": "Update an existing task's status, priority, or deadline.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "The unique ID of the task to update."},
                    "status": {
                        "type": "string",
                        "enum": ["todo", "in_progress", "completed"],
                        "description": "New status for the task."
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "urgent"],
                        "description": "New priority level."
                    },
                    "deadline": {"type": "string", "description": "Updated deadline date (YYYY-MM-DD)."}
                },
                "required": ["task_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_goal",
            "description": "Create a high-level strategic goal in Lifed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Title of the strategic objective."},
                    "description": {"type": "string", "description": "Description and desired outcomes."}
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_goals",
            "description": "Retrieve active high-level strategic goals in Lifed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "description": "Filter by status (active, completed, paused)."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_memory",
            "description": "Persist a durable user memory, preference, working style rule, or key biographical fact.",
            "parameters": {
                "type": "object",
                "properties": {
                    "content": {"type": "string", "description": "The exact preference or rule to remember."},
                    "type": {
                        "type": "string",
                        "enum": ["preference", "routine", "rule", "fact"],
                        "description": "Category of memory. Default is preference."
                    }
                },
                "required": ["content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_memory",
            "description": "Search stored personal memories and user preferences.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search topic or preference keyword."}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_daily_plan",
            "description": "Retrieve or inspect the generated daily plan.",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "Date formatted as YYYY-MM-DD. Defaults to today."}
                }
            }
        }
    }
]

def execute_tool(name: str, args: Dict[str, Any], repo: LifedRepository) -> Dict[str, Any]:
    """Deterministically execute a Lifed tool against the SQLite repository."""
    try:
        if name == "create_task":
            task = repo.create_task(
                title=args["title"],
                priority=args.get("priority", "medium"),
                estimated_duration=args.get("estimated_duration", 30),
                deadline=args.get("deadline"),
                notes=args.get("notes")
            )
            return {
                "success": True,
                "message": f"Task '{task.title}' created successfully.",
                "task": {"id": task.id, "title": task.title, "priority": task.priority, "status": task.status}
            }

        elif name == "get_tasks":
            tasks = repo.get_tasks(
                status=args.get("status"),
                priority=args.get("priority")
            )
            return {
                "success": True,
                "count": len(tasks),
                "tasks": [
                    {"id": t.id, "title": t.title, "priority": t.priority, "status": t.status, "duration": t.estimated_duration}
                    for t in tasks
                ]
            }

        elif name == "update_task":
            task = repo.update_task(
                task_id=args["task_id"],
                status=args.get("status"),
                priority=args.get("priority"),
                deadline=args.get("deadline")
            )
            if not task:
                return {"success": False, "error": f"Task with ID {args['task_id']} not found."}
            return {
                "success": True,
                "message": f"Task '{task.title}' updated.",
                "task": {"id": task.id, "status": task.status, "priority": task.priority}
            }

        elif name == "create_goal":
            goal = repo.create_goal(
                title=args["title"],
                description=args.get("description")
            )
            return {
                "success": True,
                "message": f"Goal '{goal.title}' created.",
                "goal": {"id": goal.id, "title": goal.title, "progress": goal.progress}
            }

        elif name == "get_goals":
            goals = repo.get_goals(status=args.get("status"))
            return {
                "success": True,
                "count": len(goals),
                "goals": [{"id": g.id, "title": g.title, "progress": g.progress, "status": g.status} for g in goals]
            }

        elif name == "save_memory":
            mem = memory_service.create_memory(
                repo=repo,
                content=args["content"],
                memory_type=args.get("type", "preference")
            )
            return {
                "success": True,
                "message": f"Remembered: '{mem.content}'",
                "memory": {"id": mem.id, "type": mem.type, "content": mem.content}
            }

        elif name == "search_memory":
            query = args.get("query", "")
            matches = memory_service.search_memories(repo=repo, query=query)
            return {
                "success": True,
                "count": len(matches),
                "memories": [
                    {"id": m["memory"].id, "content": m["memory"].content, "type": m["memory"].type, "similarity": m["similarity"]}
                    for m in matches
                ]
            }

        elif name == "get_daily_plan":
            from datetime import datetime
            date_str = args.get("date") or datetime.now().strftime("%Y-%m-%d")
            plan = repo.get_daily_plan(date_str)
            if not plan:
                return {"success": True, "message": f"No daily plan generated for {date_str} yet."}
            import json
            return {
                "success": True,
                "date": plan.date,
                "tasks": json.loads(plan.tasks or "[]"),
                "rationale": plan.rationale
            }

        else:
            return {"success": False, "error": f"Unknown tool: {name}"}

    except Exception as e:
        return {"success": False, "error": str(e)}
