from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

# Health
class HealthStatus(BaseModel):
    status: str
    version: str
    app: str
    database: str
    timestamp: str

# Settings & Key Configuration
class SettingsRead(BaseModel):
    has_api_key: bool
    api_key_source: str # 'env', 'custom', or 'missing'
    current_model: str
    default_model: str
    database_url: str

class SettingsUpdate(BaseModel):
    openrouter_api_key: Optional[str] = None
    model: Optional[str] = None

# Goals
class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "active"
    progress: Optional[float] = 0.0

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[float] = None

class GoalRead(GoalBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# Projects
class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "active"
    goal_id: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    goal_id: Optional[str] = None

class ProjectRead(ProjectBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# Tasks
class TaskBase(BaseModel):
    title: str
    project_id: Optional[str] = None
    priority: Optional[str] = "medium"
    deadline: Optional[str] = None
    estimated_duration: Optional[int] = 30
    status: Optional[str] = "todo"
    notes: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    project_id: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[str] = None
    estimated_duration: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class TaskRead(TaskBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# Memories
class MemoryBase(BaseModel):
    content: str
    type: Optional[str] = "preference"

class MemoryCreate(MemoryBase):
    pass

class MemoryUpdate(BaseModel):
    content: Optional[str] = None
    type: Optional[str] = None

class MemoryRead(MemoryBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class MemorySearchResult(BaseModel):
    memory: MemoryRead
    similarity: float

# Chat & Conversation
class ChatMessage(BaseModel):
    role: str # user, assistant, system, tool
    content: str
    name: Optional[str] = None
    tool_call_id: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None

# Daily Plan
class DailyPlanItem(BaseModel):
    id: Optional[str] = None
    task_id: Optional[str] = None
    title: str
    priority: str
    estimated_duration: int
    scheduled_time: Optional[str] = None
    rationale: Optional[str] = None

class DailyPlanRead(BaseModel):
    id: str
    date: str
    tasks: List[DailyPlanItem]
    rationale: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
