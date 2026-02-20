from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel

from job_applier.models.application import Application, GenerationConfig
from job_applier.models.job import JobPosting
from job_applier.models.skill import SkillLibrary
from job_applier.services.generator import generator
from job_applier.services.storage import generate_id, storage

router = APIRouter(prefix="/api/generate", tags=["generate"])


class GenerateRequest(BaseModel):
    job_id: str
    application_id: str | None = None
    config: GenerationConfig = GenerationConfig()


@router.post("/{doc_type}")
async def generate_document(doc_type: str, data: GenerateRequest):
    """Generate a CV or cover letter."""
    if doc_type not in ("cv", "letter"):
        raise HTTPException(400, "doc_type must be 'cv' or 'letter'")

    # Load job
    job = storage.load_model(
        storage.base_dir / "jobs" / data.job_id / "posting.json", JobPosting
    )
    if not job:
        raise HTTPException(404, "Job not found")

    # Load skill library
    library = storage.load_model(Path("skills/library.json"), SkillLibrary)
    if not library:
        library = SkillLibrary()

    # Create or load application
    app_id = data.application_id or generate_id()
    app_path = Path("applications") / app_id / "application.json"
    application = storage.load_model(app_path, Application)
    if not application:
        application = Application(
            id=app_id,
            job_id=data.job_id,
            generation_config=data.config,
        )

    # Generate document
    content_html = await generator.generate_document(
        doc_type, job, library, data.config, app_id
    )

    # Generate PDF
    full_html = generator.render_full_html(content_html)
    pdf_path = Path("applications") / app_id / f"{doc_type}.pdf"
    generator.generate_pdf(full_html, pdf_path)

    # Update application
    if doc_type == "cv":
        application.cv_path = str(pdf_path)
    else:
        application.letter_path = str(pdf_path)
    application.generation_config = data.config
    storage.save_model(app_path, application)

    return {
        "application_id": app_id,
        "doc_type": doc_type,
        "html": content_html,
    }


@router.get("/preview/{app_id}/{doc_type}", response_class=HTMLResponse)
async def preview_document(app_id: str, doc_type: str):
    """Get HTML preview of a generated document."""
    html_path = storage.base_dir / "applications" / app_id / f"{doc_type}.html"
    if not html_path.exists():
        raise HTTPException(404, "Document not generated yet")
    content = html_path.read_text(encoding="utf-8")
    return generator.render_full_html(content)


@router.get("/download/{app_id}/{doc_type}")
async def download_document(app_id: str, doc_type: str):
    """Download PDF of a generated document."""
    pdf_path = storage.base_dir / "applications" / app_id / f"{doc_type}.pdf"
    if not pdf_path.exists():
        raise HTTPException(404, "PDF not generated yet")
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"{doc_type}_{app_id}.pdf",
    )
