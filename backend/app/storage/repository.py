from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from backend.app.models.models import User, Goal, Project, Task, Memory, Conversation, CalendarEvent, DailyPlan
import json

class LifedRepository:
    def __init__(self, db: Session):
        self.db = db

    # ================= User & Settings =================
    def get_default_user(self) -> User:
        user = self.db.query(User).filter(User.username == "default_user").first()
        if not user:
            user = User(username="default_user", preferences="{}")
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
        return user

    def update_user_settings(self, api_key: Optional[str] = None, model: Optional[str] = None, preferences: Optional[dict] = None) -> User:
        user = self.get_default_user()
        if api_key is not None:
            user.custom_api_key = api_key if api_key.strip() else None
        if model is not None:
            user.custom_model = model if model.strip() else None
        if preferences is not None:
            user.preferences = json.dumps(preferences)
        self.db.commit()
        self.db.refresh(user)
        return user

    # ================= Goals =================
    def get_goals(self, status: Optional[str] = None) -> List[Goal]:
        q = self.db.query(Goal)
        if status:
            q = q.filter(Goal.status == status)
        return q.order_by(Goal.created_at.desc()).all()

    def get_goal_by_id(self, goal_id: str) -> Optional[Goal]:
        return self.db.query(Goal).filter(Goal.id == goal_id).first()

    def create_goal(self, title: str, description: Optional[str] = None, status: str = "active") -> Goal:
        goal = Goal(title=title, description=description, status=status)
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def update_goal(self, goal_id: str, **kwargs) -> Optional[Goal]:
        goal = self.get_goal_by_id(goal_id)
        if not goal:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(goal, key):
                setattr(goal, key, value)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def delete_goal(self, goal_id: str) -> bool:
        goal = self.get_goal_by_id(goal_id)
        if not goal:
            return False
        self.db.delete(goal)
        self.db.commit()
        return True

    # ================= Projects =================
    def get_projects(self, goal_id: Optional[str] = None, status: Optional[str] = None) -> List[Project]:
        q = self.db.query(Project)
        if goal_id:
            q = q.filter(Project.goal_id == goal_id)
        if status:
            q = q.filter(Project.status == status)
        return q.order_by(Project.created_at.desc()).all()

    def get_project_by_id(self, project_id: str) -> Optional[Project]:
        return self.db.query(Project).filter(Project.id == project_id).first()

    def create_project(self, title: str, goal_id: Optional[str] = None, description: Optional[str] = None, status: str = "active") -> Project:
        project = Project(title=title, goal_id=goal_id, description=description, status=status)
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        return project

    def update_project(self, project_id: str, **kwargs) -> Optional[Project]:
        project = self.get_project_by_id(project_id)
        if not project:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(project, key):
                setattr(project, key, value)
        self.db.commit()
        self.db.refresh(project)
        return project

    def delete_project(self, project_id: str) -> bool:
        project = self.get_project_by_id(project_id)
        if not project:
            return False
        self.db.delete(project)
        self.db.commit()
        return True

    # ================= Tasks =================
    def get_tasks(self, project_id: Optional[str] = None, status: Optional[str] = None, priority: Optional[str] = None) -> List[Task]:
        q = self.db.query(Task)
        if project_id:
            q = q.filter(Task.project_id == project_id)
        if status:
            q = q.filter(Task.status == status)
        if priority:
            q = q.filter(Task.priority == priority)
        return q.order_by(Task.created_at.desc()).all()

    def get_task_by_id(self, task_id: str) -> Optional[Task]:
        return self.db.query(Task).filter(Task.id == task_id).first()

    def create_task(self, title: str, project_id: Optional[str] = None, priority: str = "medium", deadline: Optional[str] = None, estimated_duration: int = 30, notes: Optional[str] = None) -> Task:
        task = Task(
            title=title,
            project_id=project_id,
            priority=priority,
            deadline=deadline,
            estimated_duration=estimated_duration,
            notes=notes,
            status="todo"
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update_task(self, task_id: str, **kwargs) -> Optional[Task]:
        task = self.get_task_by_id(task_id)
        if not task:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(task, key):
                setattr(task, key, value)
        self.db.commit()
        self.db.refresh(task)
        return task

    def delete_task(self, task_id: str) -> bool:
        task = self.get_task_by_id(task_id)
        if not task:
            return False
        self.db.delete(task)
        self.db.commit()
        return True

    # ================= Memories =================
    def get_memories(self, memory_type: Optional[str] = None) -> List[Memory]:
        q = self.db.query(Memory)
        if memory_type:
            q = q.filter(Memory.type == memory_type)
        return q.order_by(Memory.created_at.desc()).all()

    def get_memory_by_id(self, memory_id: str) -> Optional[Memory]:
        return self.db.query(Memory).filter(Memory.id == memory_id).first()

    def create_memory(self, content: str, memory_type: str = "preference", embedding: Optional[str] = None) -> Memory:
        mem = Memory(content=content, type=memory_type, embedding=embedding)
        self.db.add(mem)
        self.db.commit()
        self.db.refresh(mem)
        return mem

    def update_memory(self, memory_id: str, **kwargs) -> Optional[Memory]:
        mem = self.get_memory_by_id(memory_id)
        if not mem:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(mem, key):
                setattr(mem, key, value)
        self.db.commit()
        self.db.refresh(mem)
        return mem

    def delete_memory(self, memory_id: str) -> bool:
        mem = self.get_memory_by_id(memory_id)
        if not mem:
            return False
        self.db.delete(mem)
        self.db.commit()
        return True

    # ================= Daily Plan =================
    def get_daily_plan(self, date_str: str) -> Optional[DailyPlan]:
        return self.db.query(DailyPlan).filter(DailyPlan.date == date_str).first()

    def save_daily_plan(self, date_str: str, tasks: list, rationale: Optional[str] = None) -> DailyPlan:
        plan = self.get_daily_plan(date_str)
        tasks_json = json.dumps(tasks)
        if plan:
            plan.tasks = tasks_json
            plan.rationale = rationale
        else:
            plan = DailyPlan(date=date_str, tasks=tasks_json, rationale=rationale)
            self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)
        return plan
