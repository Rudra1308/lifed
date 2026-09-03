from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.routers import (
    health,
    settings as settings_router,
    goals,
    projects,
    tasks,
    dashboard,
    chat,
    memories,
    plan,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Personal AI Command Center backend API for Lifed",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all core routers
app.include_router(health.router)
app.include_router(settings_router.router)
app.include_router(goals.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(dashboard.router)
app.include_router(chat.router)
app.include_router(memories.router)
app.include_router(plan.router)

@app.get("/")
def root():
    return {
        "app": "Lifed",
        "description": "Personal AI Command Center",
        "status": "online",
        "version": settings.version,
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.backend_host, port=settings.backend_port, reload=True)
