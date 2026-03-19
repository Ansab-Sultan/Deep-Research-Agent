# Product Requirements Document (PRD)
## Open Deep Research Agent

**Version:** 1.2  
**Author:** Muhammad Ansab Sultan  
**Date:** March 2026  
**Status:** Draft

---

## 1. Overview

### 1.1 Product Summary
Open Deep Research Agent is a fully autonomous, full-stack AI application that accepts a research topic from a user and produces a comprehensive, structured, and cited report — automatically. It mimics the workflow of a human researcher by planning, searching, evaluating, and writing in multiple passes (including section-by-section drafting) without any manual intervention.

### 1.2 Motivation
Most AI tools either answer questions superficially or require the user to manually search and paste content. This product eliminates that gap by deploying a multi-node agentic pipeline that iteratively gathers and validates information before producing a final report, all exposed through a clean web interface.

### 1.3 Goals
- Demonstrate a production-grade multi-agent LangGraph system publicly on GitHub
- Deliver real research value to end users with minimal input
- Showcase full-stack AI engineering (agent core + backend API + frontend)

---

## 2. Target Users

| User Type | Description |
|---|---|
| Students & Researchers | Need quick, structured overviews on academic or technical topics |
| Developers & Engineers | Want to explore a technology landscape before diving in |
| Product Managers | Need competitive or market research synthesized fast |
| Open Source Community | Developers who want to learn from or contribute to an agentic system |

---

## 3. User Stories

- **As a user**, I want to enter a topic and receive a well-structured research report so that I don't have to manually search and compile information.
- **As a user**, I want to see real-time progress (Searching… Summarizing… Writing…) so that I know the agent is working and what it's doing.
- **As a user**, I want the final report to include cited sources so that I can verify the information.
- **As a user**, I want to choose a research depth (Quick / Standard / Deep) so that I can control how thorough the output is.
- **As a user**, I want to download the report as Markdown or PDF so that I can use it outside the app.
- **As a user**, I want to ask follow-up questions on a completed report and receive answers with citations pointing to specific parts of the report so that I can drill deeper without re-reading everything.
- **As a developer**, I want clean API endpoints so that I can integrate the research agent into my own applications.

---

## 4. Features

### 4.1 Core Features (MVP)

| # | Feature | Description | Priority |
|---|---|---|---|
| F1 | Topic Input | Single text input to enter a research topic | P0 |
| F2 | Agentic Research Pipeline | Multi-node LangGraph agent (Planner → Researcher → Summarizer → Critic → Writer Planner → Section Writer → Polish) with iterative evidence accumulation and section-wise long-form writing | P0 |
| F3 | Real-Time Progress Streaming | SSE stream showing which node is active and what it's doing | P0 |
| F4 | Structured Report Output | Final report rendered as formatted Markdown with sections and citations | P0 |
| F5 | Source Citations | All sources listed at the bottom of the report with URLs | P0 |

### 4.2 Enhanced Features (Post-MVP)

| # | Feature | Description | Priority |
|---|---|---|---|
| F6 | Research Depth Selector | Quick (1 iter) / Standard (2 iter) / Deep (3 iter) modes | P1 |
| F7 | Report Export | Download report as `.md` or `.pdf` | P1 |
| F8 | Research History (MongoDB) | All completed reports are persisted in MongoDB. The sidebar lists past reports by title (= the original topic) and creation date. Clicking a report opens its full markdown content, sources, and any follow-up Q&A pairs that were asked during that session | P2 |
| F10 | Job Management Endpoints | Backend exposes job list, single-job detail, and full delete for completed/failed jobs to support chat-style history UX | P1 |
| F9 | RAG-Powered Follow-up Questions | After report generation, the report is chunked, embedded, and stored in Qdrant. Follow-up questions are answered via RAG with inline citations pointing to the exact report chunks used as context | P1 |

---

## 5. User Flow

```
User enters topic
        ↓
Selects research depth (optional)
        ↓
Clicks "Research"
        ↓
Live progress panel updates in real-time
  [✓ Planning sub-questions...]
  [✓ Searching the web...]
  [✓ Summarizing findings...]
  [✓ Evaluating coverage...]
  [✓ Writing section 1/8...]
  [✓ Writing section 2/8...]
  [...]
  [✓ Assembling full draft...]
  [✓ Polishing clarity (no content deletion)...]
  [✓ Indexing report into Qdrant...]
        ↓
Final report rendered on screen
        ↓
User reads, copies, or downloads report
        ↓
User types a follow-up question in the Q&A panel
        ↓
System retrieves relevant report chunks from Qdrant
        ↓
Answer rendered with inline citations linking back to report sections
```

---

## 6. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Report generation time | < 60 seconds for Standard depth |
| API uptime | 99.9% (Docker-based, restartable) |
| Streaming latency | First progress event within 3 seconds of submission |
| LLM hallucination mitigation | All claims grounded in web search results |
| Max research iterations | 3 (hard cap, circuit breaker) |
| Long-form writing strategy | Final report is generated in multiple section-level LLM calls, not a single monolithic call |
| Polish length retention | Final polished report must retain at least 95% of draft word count |
| Concurrent requests | At least 5 simultaneous research jobs |
| Follow-up question response time | < 5 seconds |
| RAG citation accuracy | Every answer references the chunk(s) it was derived from |

---

## 7. Out of Scope (v1)

- User authentication and accounts
- Multi-language report output
- Fine-tuned or custom LLMs
- Mobile native app

---

## 8. Success Metrics

- GitHub stars and forks (community adoption)
- Average report generation time
- Critic node loop rate (how often the agent self-corrects)
- User session length on the frontend
- Follow-up questions asked per session (measures report engagement)
- RAG citation hit rate (chunks retrieved that the user found useful)
