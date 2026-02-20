from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

from job_applier.models.job import JobPosting
from job_applier.services.extractor import extractor
from job_applier.services.parser import parser
from job_applier.services.storage import generate_id, storage

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


class JobExtractRequest(BaseModel):
    url: str | None = None
    text: str | None = None


@router.post("/extract", response_model=JobPosting)
async def extract_job(data: JobExtractRequest):
    """Extract structured job posting from URL or text."""
    if data.url:
        raw_text = await parser.parse_url(data.url)
        source_type = "url"
    elif data.text:
        raw_text = data.text
        source_type = "text"
    else:
        raise HTTPException(400, "Provide either url or text")

    job = await extractor.extract_job_posting(raw_text)
    job.raw_text = raw_text
    job.source_url = data.url or ""
    job.source_type = source_type

    # Save job
    storage.save_model(Path("jobs") / job.id / "posting.json", job)
    return job


@router.post("/extract/image", response_model=JobPosting)
async def extract_job_from_image(file: UploadFile):
    """Extract structured job posting from an uploaded image."""
    content = await file.read()
    media_type = parser.detect_media_type(file.filename or "image.png")
    raw_text = await parser.parse_image(content, media_type)

    job = await extractor.extract_job_posting(raw_text)
    job.raw_text = raw_text
    job.source_type = "image"

    storage.save_model(Path("jobs") / job.id / "posting.json", job)
    return job


@router.get("", response_model=list[JobPosting])
async def list_jobs():
    jobs: list[JobPosting] = []
    jobs_dir = storage.base_dir / "jobs"
    if jobs_dir.exists():
        for job_dir in sorted(jobs_dir.iterdir(), reverse=True):
            posting_path = job_dir / "posting.json"
            if posting_path.exists():
                job = storage.load_model(posting_path, JobPosting)
                if job:
                    jobs.append(job)
    return jobs


@router.get("/{job_id}", response_model=JobPosting)
async def get_job(job_id: str):
    job = storage.load_model(
        storage.base_dir / "jobs" / job_id / "posting.json", JobPosting
    )
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.put("/{job_id}", response_model=JobPosting)
async def update_job(job_id: str, data: JobPosting):
    path = storage.base_dir / "jobs" / job_id / "posting.json"
    if not path.exists():
        raise HTTPException(404, "Job not found")
    data.id = job_id
    storage.save_model(path, data)
    return data


@router.delete("/{job_id}")
async def delete_job(job_id: str):
    deleted = storage.delete_path(Path("jobs") / job_id)
    if not deleted:
        raise HTTPException(404, "Job not found")
    return {"deleted": True}
