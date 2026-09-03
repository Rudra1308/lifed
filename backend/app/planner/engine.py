from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from backend.app.storage.repository import LifedRepository

class DailyPlannerEngine:
    @staticmethod
    def generate_plan(
        repo: LifedRepository,
        target_hours: float = 6.0,
        prioritize_goal_id: Optional[str] = None
    ) -> Dict[str, Any]:
        date_str = datetime.now().strftime("%Y-%m-%d")
        
        all_tasks = repo.get_tasks()
        pending_tasks = [t for t in all_tasks if t.status != "completed"]
        goals = {g.id: g for g in repo.get_goals()}
        memories = repo.get_memories()

        # Check for user working preferences
        prefers_morning_deep_work = any(
            "morning" in m.content.lower() and ("technical" in m.content.lower() or "focus" in m.content.lower() or "coding" in m.content.lower())
            for m in memories
        )
        has_meeting_constraints = any(
            "meeting" in m.content.lower() for m in memories
        )

        # 1. Scoring & Ranking
        priority_weights = {"urgent": 45, "high": 30, "medium": 15, "low": 5}
        scored_tasks = []

        for task in pending_tasks:
            score = priority_weights.get(task.priority.lower(), 15)
            
            # Goal alignment bonus
            if task.project_id:
                proj = repo.get_project_by_id(task.project_id)
                if proj and proj.goal_id and proj.goal_id in goals:
                    score += 25
                    if prioritize_goal_id and proj.goal_id == prioritize_goal_id:
                        score += 30

            # Deadline urgency bonus
            if task.deadline:
                try:
                    dl = datetime.strptime(task.deadline, "%Y-%m-%d").date()
                    today = datetime.now().date()
                    diff = (dl - today).days
                    if diff <= 0:
                        score += 40 # Overdue or due today
                    elif diff <= 2:
                        score += 20
                except Exception:
                    pass

            scored_tasks.append((score, task))

        # Sort descending by priority score
        scored_tasks.sort(key=lambda x: x[0], reverse=True)

        # 2. Time block scheduling
        max_minutes = int(target_hours * 60)
        allocated_minutes = 0
        scheduled_items = []
        current_time = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)

        for rank, (score, task) in enumerate(scored_tasks, 1):
            dur = task.estimated_duration or 30
            if allocated_minutes + dur > max_minutes and len(scheduled_items) >= 2:
                break # Reached daily capacity

            end_time = current_time + timedelta(minutes=dur)
            time_slot = f"{current_time.strftime('%H:%M')} - {end_time.strftime('%H:%M')}"

            # Formulate rationale
            reasons = []
            if task.priority in ["urgent", "high"]:
                reasons.append(f"{task.priority.upper()} priority rating")
            if task.deadline:
                reasons.append(f"approaching deadline ({task.deadline})")
            if prefers_morning_deep_work and current_time.hour < 12:
                reasons.append("aligned with your saved preference for morning deep technical work")

            rationale_str = f"Prioritized as #{rank} based on {', '.join(reasons) if reasons else 'operational sequencing'}."

            scheduled_items.append({
                "id": task.id,
                "task_id": task.id,
                "title": task.title,
                "priority": task.priority,
                "estimated_duration": dur,
                "scheduled_time": time_slot,
                "rationale": rationale_str
            })

            allocated_minutes += dur
            # Add 15 minute break/buffer between focus sessions
            current_time = end_time + timedelta(minutes=15)

        # 3. Overall executive rationale
        total_hours = round(allocated_minutes / 60, 1)
        exec_rationale = (
            f"Synthesized a {total_hours}h focus plan containing {len(scheduled_items)} high-value deliverables. "
            f"Tasks are scheduled starting at 09:00 to honor your morning focus rhythm. "
            f"High-impact objectives are scheduled first to guarantee milestone progress."
        )

        # 4. Persist plan
        plan_record = repo.save_daily_plan(date_str, scheduled_items, exec_rationale)

        return {
            "id": plan_record.id,
            "date": date_str,
            "tasks": scheduled_items,
            "rationale": exec_rationale,
            "allocated_hours": total_hours,
            "created_at": plan_record.created_at.isoformat() if plan_record.created_at else None
        }

daily_planner = DailyPlannerEngine()
