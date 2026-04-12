# Tarsheeh.cv

**Tarsheeh.cv** is a multi-agent AI recruitment system designed for small and growing businesses.  
It helps automate and improve the hiring process by analyzing job requirements, screening CVs, ranking candidates, generating interview questions, and producing structured reports.

Built for the **Agenticthon** hackathon under the **Multi-Agent Systems** track.

## Team
**Nexus | روابط**  
- **Maisara** | Team Leader, Co-founder
- **Osama** | Team Member, Co-founder

## Problem
Small and growing businesses often do not have the time, tools, or specialized HR resources needed to review candidates efficiently. Manual screening is slow, inconsistent, and difficult to scale.

## Our Solution
Tarsheeh.cv uses multiple AI agents that collaborate to handle different parts of the recruitment workflow:
- understand the job requirements
- analyze candidate CVs
- rank applicants based on fit
- generate interview questions
- produce a final report for the recruiter

## Core Features
- Multi-agent recruitment workflow
- CV parsing and analysis
- Job–candidate matching
- Candidate ranking and scoring
- Interview question generation
- Recruitment report generation
- Interactive web dashboard

## Tech Stack
- **Backend:** Python, FastAPI
- **Agent Framework:** LangGraph, LangChain
- **Vector Database:** Supabase pgvector
- **LLM / Embeddings:** OpenAI GPT-4o, text-embedding-3-small
- **PDF Processing:** pdfplumber
- **Reports:** ReportLab
- **Frontend:** Next.js, Tailwind CSS

## Project Structure
- `backend/`: API, agents, RAG, and core logic
- `frontend/`: web interface
- `docs/`: documentation and planning materials

## Development Roadmap
- Phase 0: Project setup and infrastructure
- Phase 1: Backend foundation
- Phase 2: RAG pipeline
- Phase 3: Agent development
- Phase 4: REST API endpoints
- Phase 5: UI screens
- Phase 6: Integration and testing
- Phase 7: Stress testing, deployment, and demo preparation
- Phase 8: Slides, pitch, and Q&A prep

## Status
Project in active development for Agenticthon.

## License
MIT License
