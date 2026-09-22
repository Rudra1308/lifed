from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path
import os

# Load .env from project root or backend
root_dir = Path(__file__).resolve().parent.parent.parent
env_path = root_dir / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

class Settings(BaseModel):
    app_name: str = "Lifed API"
    version: str = "3.0.0"
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./lifed.db")
    backend_host: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    backend_port: int = int(os.getenv("BACKEND_PORT", "8000"))
    
    # OpenRouter LLM Settings
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_default_model: str = os.getenv("OPENROUTER_DEFAULT_MODEL", "anthropic/claude-3.5-sonnet")
    openrouter_base_url: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

    # Local Ollama Settings
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
    ollama_planner_model: str = os.getenv("OLLAMA_PLANNER_MODEL", "llama3:latest")
    ollama_context_model: str = os.getenv("OLLAMA_CONTEXT_MODEL", "gemma4:e4b")

    # Google Gemini Settings
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai"

    # Orchestration Mode: 'hybrid', 'local_only', 'cloud_only'
    orchestration_mode: str = os.getenv("ORCHESTRATION_MODE", "hybrid")

    # CORS origins
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

settings = Settings()

