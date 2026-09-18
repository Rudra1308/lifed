# Lifed — Personal AI Command Center

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Local--First-003B57?style=flat-square&logo=sqlite)](https://www.sqlite.org/)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-Multi--Model-6366F1?style=flat-square)](https://openrouter.ai/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

**Lifed** is a lightweight, personal-first AI command center and decision-support operating system. It connects high-level strategic goals, actionable projects, tasks, deadlines, and durable semantic memory, synthesizing this context through an autonomous tool-calling AI orchestrator and an intelligent daily planning engine.

The visual interface is built with an interactive **Kinetic Matrix** particle lattice that responds to pointer physics, supports 5 context-adaptive rendering modes, and transitions between monochrome Dark and Light themes in real time.

---

## The Core Loop

```
Understand → Remember → Plan → Decide → Execute → Learn
```

1. **Understand**: Synthesizes tasks, project relationships, upcoming deadlines, and goal progress into an actionable Command Center.
2. **Remember**: Stores user preferences, routines, constraints, and working facts locally using on-device dense vector embeddings (zero cloud leaks).
3. **Plan**: Deterministically ranks pending tasks by urgency, importance, and goal impact, scheduling time blocks that honor individual working styles.
4. **Decide**: Evaluates trade-offs and generates explicit, data-backed rationale explaining why tasks are ordered the way they are.
5. **Execute**: Invokes approved tools to create, update, and manage tasks, goals, and durable memory records directly through natural language.
6. **Learn**: Adapts subsequent planning cycles as constraints change, tasks complete, or new user preferences are recorded.

---

## System Architecture

```mermaid
flowchart TB
    subgraph Frontend["Frontend Layer (Next.js 14 + Tailwind CSS)"]
        UI_Shell["App Shell & Navigation Rail"]
        Kinetic["Kinetic Matrix Canvas (5 Physics Modes)"]
        Theme["Theme Provider (Dark / Light)"]
        Key_Modal["Zero-Config API Key & Model Modal"]
        
        Dashboard["Dashboard (/)"]
        Brief["Daily Brief (/brief)"]
        Tasks["Task Manager (/tasks)"]
        Projects["Projects (/projects)"]
        Goals["Strategic Goals (/goals)"]
        Memory_UI["Durable Memory (/memory)"]
        Chat_UI["AI Chat (/chat)"]
    end

    subgraph Backend["Backend Layer (Python + FastAPI)"]
        API_Gateway["FastAPI ASGI Gateway"]
        
        subgraph Services["Core Engines"]
            AI_Orch["AI Tool Orchestrator"]
            Planner["Daily Planning Engine"]
            Embed_Engine["Local Vector Engine (ONNX FastEmbed)"]
        end

        subgraph DAO["Storage Abstraction Layer"]
            Repo["LifedRepository Pattern"]
            SQLite[("Local SQLite Database (lifed.db)")]
        end
    end

    subgraph External["External Model Gateway"]
        OpenRouter["OpenRouter API (Claude 3.5, Gemini 2.0, GPT-4o)"]
    end

    Frontend -->|HTTP / JSON| API_Gateway
    API_Gateway --> AI_Orch
    API_Gateway --> Planner
    API_Gateway --> Embed_Engine
    
    AI_Orch -->|Tool Schema & Multi-Turn Loop| OpenRouter
    AI_Orch -->|Execute Controlled Tools| Repo
    Planner -->|Rank & Rationale| Repo
    Embed_Engine -->|Dense 384-dim Vectors| Repo
    
    Repo --> SQLite
```

---

## Key Features

### 1. Interactive Kinetic Matrix Visual System
- **HTML5 Canvas physics**: Drifting particle lattice, distance-based tension strands, traveling synaptic pulses, and elastic pointer shockwaves.
- **5 Context-Aware UI Modes**:
  - `Ambient`: Full visual density and interactive shockwaves for the Command Center Dashboard.
  - `Focus`: Quieted grid, reduced drift, and disabled shockwaves on data-dense screens (Tasks, Projects, Goals, Memory) for distraction-free reading.
  - `Conversational`: Low-opacity edge treatment for AI Chat, pulsing during model reasoning.
  - `Reduced-Motion`: Static lattice disabling all continuous motion and pointer repulsion in compliance with accessibility standards.
  - `Compact`: Adaptive grid density for mobile and tablet screens.
- **Theme-Aware Physics**: Adapts canvas background, node points, connecting strands, and pulse glow colors between Dark and Light modes without reloading.

### 2. Autonomous Tool Calling Engine
Lifed exposes 8 controlled tool functions to the LLM:
- `create_task(title, priority, estimated_duration, deadline, notes)`
- `get_tasks(status, priority)`
- `update_task(task_id, status, priority, deadline)`
- `create_goal(title, description)`
- `get_goals(status)`
- `save_memory(content, type)`
- `search_memory(query)`
- `get_daily_plan(date)`

Tool executions are logged unobtrusively in collapsible technical cards (`ToolCallCard`), displaying argument parameters and JSON return values.

### 3. Local-First Durable Semantic Memory
- Computes **384-dimensional dense vector embeddings** locally on CPU using `fastembed` with ONNX runtime (`BAAI/bge-small-en-v1.5`).
- Semantic vector similarity search via mathematical cosine similarity:
  $$\text{sim}(\mathbf{u}, \mathbf{v}) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2}$$
- Complete user sovereignty: stored memories can be inspected, searched semantically with live match scores, and permanently deleted with one click.
- 100% private: memory embeddings are calculated and stored locally on your machine without external cloud transmission.

### 4. Intelligent Planning & Recommendation Rationale
- **Deterministic Multi-Factor Scoring**: Evaluates urgency (approaching deadlines), importance rating (`urgent`, `high`, `medium`, `low`), and strategic goal alignment.
- **Memory-Conditioned Scheduling**: Inspects durable memory rules (e.g. *"User prefers technical work in the morning"*) to schedule cognitive heavy lifting into 09:00 AM focus blocks.
- **Data-Backed Rationale**: Generates transparent explanations for every prioritized deliverable and provides an executive planning summary.

---

## Two-Version Strategy

1. **Open-Source GitHub Version**:
   - Clean, sanitized codebase with zero personal secrets or hard-coded credentials.
   - Includes `.env.example` and a realistic demo seed script (`python -m backend.seed`).
   - GitHub cloners can run the application immediately and enter their OpenRouter key directly via the UI modal.
2. **Personal Private Installation**:
   - Stores real daily tasks, personal goals, and private memories in a local SQLite file (`lifed.db`).
   - Excluded from git tracking via `.gitignore`.
   - Option to store persistent API key in private `.env`.

---

---

## Running as a Desktop Application

Lifed is packaged with a dedicated **Electron Desktop Shell** that manages the Python FastAPI backend, provides global hotkeys, and supports real-time voice dictation.

### One-Click Desktop Launch (Windows)
Double-click `lifed.bat` in the project root. It will verify dependencies, auto-start the Python backend and Next.js frontend, and open the native Lifed desktop window.

### Command Line Launch (All Platforms)
```bash
# 1. Install dependencies
pip install -r backend/requirements.txt
cd frontend && npm install
cd ../desktop && npm install

# 2. Launch the desktop app
cd ../frontend && npm run desktop
```

### Desktop Capabilities
- **Global Quick-Capture Overlay (`Alt+Space`)**: Press `Alt+Space` from anywhere in Windows to summon the floating Spotlight/Raycast-style command bar. Capture tasks, define goals, save memories, or query the AI mesh without leaving your current work.
- **Local Voice-to-Command**: Click the microphone icon to dictate tasks and prompts in real-time with an animated audio waveform.
- **Auto-Managed Lifecycle**: Launching Lifed automatically spins up the FastAPI backend and frontend; closing the window cleanly shuts down all background processes so ports are never left occupied.

---

## Hybrid Multi-Agent Orchestration

Lifed coordinates local models and cloud intelligence into a collaborative mesh:

| Agent Role | Model | Operation | Cost |
| :--- | :--- | :--- | :--- |
| **🧠 Context & Memory Agent** | `gemma4:e4b` (Local Ollama) | Scans vector memories, filters private data, formats context dossier | **$0 Free** |
| **⚡ Operations & Tool Agent** | `llama3:latest` (Local Ollama) | Executes SQLite CRUD actions (`create_task`, `update_task`, `create_goal`) | **$0 Free** |
| **🎯 Executive Strategist** | Google Gemini 2.0 / OpenRouter | Evaluates long-term trade-offs, synthesizes strategy & planning rationale | Free tier / Cloud |

*Offline Fallback: If offline or without cloud API keys, `llama3:latest` seamlessly completes all planning and synthesis locally on your machine.*

---

## Desktop Application Mode (Electron)

Lifed can run as a native desktop application with a global quick-capture overlay and automatic lifecycle management.

### One-Click Windows Launch
Double-click `lifed.bat` in the project root. It will:
1. Automatically verify and install desktop shell dependencies.
2. Auto-spawn the Python FastAPI backend on port `8000`.
3. Auto-spawn the Next.js server on port `3000`.
4. Open the native desktop command center window.

### Global Quick-Capture Overlay (`Ctrl+Space`)
- Press **`Ctrl+Space`** from anywhere on your system to summon the floating Spotlight-style quick-capture HUD.
- Enter quick tasks, goals, memories, or ask the hybrid multi-agent mesh questions directly.
- Click the **Microphone** icon to dictate with real-time voice-to-text.
- Press **`Esc`** to dismiss the overlay or **`Enter`** to submit.

### Launching Desktop via Command Line
```bash
cd frontend
npm run desktop
```

---

## Getting Started (Web / Localhost)

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: 3.10 or higher
- **Local Models (Optional)**: Ollama with `llama3:latest` and `gemma4:e4b`
- **Cloud Models (Optional)**: Google Gemini API key or OpenRouter API key

### 1. Repository Setup
```bash
git clone https://github.com/yourusername/lifed.git
cd lifed
```

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Seed the database with clean demo data
python -m backend.seed

# Start the FastAPI server (runs at http://127.0.0.1:8000)
python -m uvicorn backend.app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend

# Install Node dependencies
npm install

# Start the Next.js development server (runs at http://localhost:3000)
npm run dev
```

### 4. Zero-Config UI Setup (No File Edits Required)
1. Open [http://localhost:3000](http://localhost:3000) in your browser (or launch via `lifed.bat`).
2. Click the **"SET AI KEY"** button in the top-right corner of the header.
3. Configure your preferences across the tabs:
   - **Hybrid Mesh**: Choose Hybrid, 100% Local, or Cloud Only.
   - **Local (Ollama)**: Test connection to `http://localhost:11434/v1`.
   - **Google Gemini**: Enter your free Gemini API key from Google AI Studio.
   - **OpenRouter**: Enter OpenRouter key if desired.
4. Click **Save Settings** and command your AI operating system!



---

## Running Automated Tests

Lifed comes with a comprehensive pytest suite verifying health checks, database DAO operations, tool calling schemas, local ONNX embeddings, and the daily planning engine:

```bash
# Run full backend test suite
python -m pytest backend/tests/ -v
```

Expected output:
```
backend/tests/test_phase1.py::test_health_check PASSED
backend/tests/test_phase1.py::test_root_endpoint PASSED
backend/tests/test_phase1.py::test_storage_repository_and_settings PASSED
backend/tests/test_phase3.py::test_goals_crud PASSED
backend/tests/test_phase3.py::test_projects_crud PASSED
backend/tests/test_phase3.py::test_tasks_and_dashboard PASSED
backend/tests/test_phase4.py::test_tool_definitions_validity PASSED
backend/tests/test_phase4.py::test_tool_execution PASSED
backend/tests/test_phase4.py::test_chat_without_api_key PASSED
backend/tests/test_phase5.py::test_local_embedding_engine PASSED
backend/tests/test_phase5.py::test_memory_service_and_api PASSED
backend/tests/test_phase6.py::test_daily_planner_ranking_and_rationale PASSED
backend/tests/test_phase6.py::test_daily_plan_endpoints PASSED

======================== 13 passed in 1.57s ========================
```

To verify the Next.js production build:
```bash
cd frontend
npm run build
```

---

## Tech Stack Overview

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14 (App Router, TypeScript) | Server & client rendering, responsive layout, type safety |
| **Styling & Theme** | Tailwind CSS + next-themes | Dark/Light theme switching, bespoke typography & scrollbars |
| **Visual Animation** | React + HTML5 Canvas | High-performance Kinetic Matrix particle lattice simulation |
| **Icons** | Lucide React | Clean, minimalist technical iconography |
| **Backend API** | Python + FastAPI | High-speed async REST endpoints & tool orchestration |
| **Database** | SQLite + SQLAlchemy | Local-first relational persistence via repository abstraction |
| **Semantic Embeddings** | FastEmbed (ONNX Runtime) | Local 384-dimensional dense vector calculation on CPU |
| **LLM Gateway** | OpenRouter API | Model-agnostic AI access with multi-turn tool calling |

---

## Portfolio Evaluation Guide

When evaluating this project in a technical interview:
- **Architecture**: Notice the clean Repository pattern (`backend/app/storage/repository.py`) decoupling SQLite from router controllers.
- **AI Engineering**: Inspect `backend/app/ai/orchestrator.py` to see the complete multi-turn tool calling loop intercepting LLM function calls, executing database actions, and feeding results back.
- **Local-First Privacy**: Inspect `backend/app/memory/embeddings.py` to see how semantic search operates offline using on-device ONNX models without transmitting personal memories to third-party embedding APIs.
- **Frontend Craft**: Inspect `frontend/components/ui/kinetic-matrix.tsx` for custom canvas physics, pointer shockwaves, and theme-reactive rendering.

---

## License
MIT License. Created for portfolio demonstration and daily personal productivity.