from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from job_applier.config import settings
from job_applier.routers import library, jobs, skills, generate, applications, chat, matching
from job_applier.services.storage import storage


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure data directories exist on startup
    storage._ensure_directories()
    yield


app = FastAPI(title="Job Applier", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(library.router)
app.include_router(jobs.router)
app.include_router(skills.router)
app.include_router(generate.router)
app.include_router(applications.router)
app.include_router(chat.router)
app.include_router(matching.router)


@app.get("/api/health")
async def health_check():
    has_key = bool(
        settings.anthropic_api_key
        if settings.llm_provider == "anthropic"
        else settings.openai_api_key
    )
    return {
        "status": "ok",
        "version": "0.1.0",
        "llm_provider": settings.llm_provider,
        "llm_configured": has_key,
    }


@app.get("/api/usage")
async def get_usage():
    from job_applier.services.usage import usage_tracker

    records = usage_tracker.get_records()
    summary = usage_tracker.get_summary()
    return {
        "records": [r.model_dump(mode="json") for r in records],
        "summary": summary.model_dump(),
    }


@app.get("/api/usage/summary")
async def get_usage_summary():
    from job_applier.services.usage import usage_tracker

    return usage_tracker.get_summary().model_dump()


@app.get("/api/llm/test")
async def test_llm():
    """Verify that the LLM connection works by making a minimal API call."""
    from job_applier.services.llm import llm

    has_key = bool(
        settings.anthropic_api_key
        if settings.llm_provider == "anthropic"
        else settings.openai_api_key
    )
    if not has_key:
        return {
            "status": "error",
            "provider": settings.llm_provider,
            "message": f"No API key configured. Set {'ANTHROPIC_API_KEY' if settings.llm_provider == 'anthropic' else 'OPENAI_API_KEY'} in your .env file.",
        }

    try:
        response = await llm.generate_text("Reply with exactly: OK", max_tokens=10)
        return {
            "status": "ok",
            "provider": settings.llm_provider,
            "model": settings.generation_model,
            "response": response.strip(),
        }
    except Exception as e:
        return {
            "status": "error",
            "provider": settings.llm_provider,
            "message": str(e),
        }


# Serve frontend static files in production
frontend_dist = Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
