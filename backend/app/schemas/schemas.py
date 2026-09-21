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
    has_gemini_key: bool = False
    gemini_key_source: str = "missing"
    gemini_model: str = "gemini-2.0-flash"
    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_planner_model: str = "llama3:latest"
    ollama_context_model: str = "gemma4:e4b"
    orchestration_mode: str = "hybrid"

class SettingsUpdate(BaseModel):
    openrouter_api_key: Optional[str] = None
    model: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    ollama_base_url: Optional[str] = None
    ollama_planner_model: Optional[str] = None
    ollama_context_model: Optional[str] = None
    orchestration_mode: Optional[str] = None


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

# Notifications & Morning Digest
class NotificationSettings(BaseModel):
    enabled: bool = False
    channel: str = "telegram" # telegram, discord, whatsapp, email
    time: str = "08:00" # HH:MM format
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    discord_webhook_url: Optional[str] = None
    whatsapp_phone: Optional[str] = None
    whatsapp_apikey: Optional[str] = None
    webhook_url: Optional[str] = None # n8n or custom webhook
    email_to: Optional[str] = None
    smtp_host: Optional[str] = "smtp.gmail.com"
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None
    example_quote: Optional[str] = "The impediment to action advances action. What stands in the way becomes the way. — Marcus Aurelius"
    quote_theme: Optional[str] = "Stoic resilience, focus, and relentless momentum"
    include_tasks: bool = True
    include_projects: bool = True
    include_goals: bool = True
    include_quote: bool = True

class NotificationSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    channel: Optional[str] = None
    time: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    discord_webhook_url: Optional[str] = None
    whatsapp_phone: Optional[str] = None
    whatsapp_apikey: Optional[str] = None
    webhook_url: Optional[str] = None
    email_to: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None
    example_quote: Optional[str] = None
    quote_theme: Optional[str] = None
    include_tasks: Optional[bool] = None
    include_projects: Optional[bool] = None
    include_goals: Optional[bool] = None
    include_quote: Optional[bool] = None

class QuotePreviewRequest(BaseModel):
    example_quote: Optional[str] = None
    quote_theme: Optional[str] = None

class NotificationTestRequest(BaseModel):
    channel: Optional[str] = None

