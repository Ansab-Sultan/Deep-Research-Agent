# Deep Research Agent

![Python](https://img.shields.io/badge/Python-3.11%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-green)
![Next.js](https://img.shields.io/badge/Next.js-16.2%2B-black)
![React](https://img.shields.io/badge/React-19-blue)

## Overview

Deep Research Agent is an open-source, AI-powered research assistant designed to perform comprehensive, multi-step investigations. Utilizing a hybrid architecture with a robust FastAPI backend and a responsive Next.js frontend, it leverages advanced language models and vector search to synthesize precise, reliable findings from the web and internal documents.

## Demo

<video src="https://raw.githubusercontent.com/Ansab-Sultan/Deep-Research-Agent/main/assets/demo-video.webm" controls="controls" width="100%"></video>

## Key Features

- **Automated Research Pipelines:** Executes complex, iterative research tasks autonomously using LangGraph.
- **Vector Search Integration:** Built-in support for Qdrant to power highly accurate Retrieval-Augmented Generation (RAG).
- **Modern User Interface:** A sleek, responsive frontend built with React 19 and Next.js for managing and interrogating research reports.
- **Asynchronous & Scalable:** Async-first backend design utilizing FastAPI, Redis, and Motor (MongoDB).

## 🚀 Quick Start

### Prerequisites
Before you begin, ensure you have the following installed:
- **Python 3.11+**
- **Node.js (v20+)**
- **Docker & Docker Compose**
- **uv** (Optional but recommended): Install via `curl -LsSf https://astral.sh/uv/install.sh | sh` or follow the [official instructions](https://github.com/astral-sh/uv).

### 1. Clone & Environment Setup

```bash
git clone https://github.com/Ansab-Sultan/Deep-Research-Agent.git
cd Deep-Research-Agent
cp backend/.env.example backend/.env  # Make sure to configure your API keys!
```

#### Environment Variables Setup

Open `backend/.env` and configure the following essential keys:

- **LLM Configuration:**
  - `GEMINI_API_KEY`: Get your key from [Google AI Studio](https://aistudio.google.com/).
  - `GEMINI_MODEL`: Default is `gemini-3.1-flash-lite-preview`.

- **Search Tool:**
  - `TAVILY_API_KEY`: Required for web search capabilities. Get it from [Tavily](https://tavily.com/).

- **Database URLs (Default values work for local Docker setup):**
  - `MONGODB_URL`: `mongodb://localhost:27017`
  - `REDIS_URL`: `redis://localhost:6379/0`
  - `QDRANT_URL`: `http://localhost:6333`


### 2. Services Startup (Qdrant Vector Database)

The backend relies on Qdrant. Start it using Docker Compose:

```bash
cd backend/qdrant
docker compose up -d
cd ../..
```

### 3. Backend Startup

**Option A: Using `uv` (Recommended)**
`uv` is an extremely fast package manager for Python.
```bash
cd backend
uv sync
# Start the FastAPI server using the environment created by uv
uv run uvicorn app.main:app --reload --port 8000
# Alternatively, if you activated the virtual environment:
# source .venv/bin/activate
# uvicorn app.main:app --reload --port 8000
```

**Option B: Using standard `pip`**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install .              # Install dependencies from pyproject.toml
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Startup

Open a new terminal window for the frontend:

```bash
cd frontend
npm install
npm run dev
```

## Usage

Once both servers and the database are running:
1. Navigate to `http://localhost:3000` in your browser to access the sleek Next.js UI and start a research task.
2. Access the backend Swagger UI documentation by navigating to `http://localhost:8000/docs` to test endpoints manually.

## 📚 Documentation

For detailed Architecture, Business Logic, and API Reference, please see the [Documentation Folder](./documentation).
