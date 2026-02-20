from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from job_applier.models.application import Application, ApplicationStatus, FollowUp
from job_applier.models.job import JobPosting
from job_applier.services.storage import generate_id, storage

router = APIRouter(prefix="/api/applications", tags=["applications"])


class ApplicationCreate(BaseModel):
    job_id: str


class ApplicationUpdate(BaseModel):
    status: ApplicationStatus | None = None
    notes: str | None = None


class FollowUpCreate(BaseModel):
    type: str = ""
    notes: str = ""


class ApplicationWithJob(BaseModel):
    application: Application
    job_title: str = ""
    company: str = ""


@router.post("", response_model=Application)
async def create_application(data: ApplicationCreate):
    """Create a new application for a job posting."""
    # Verify the job exists
    job = storage.load_model(
        storage.base_dir / "jobs" / data.job_id / "posting.json", JobPosting
    )
    if not job:
        raise HTTPException(404, "Job not found")

    app = Application(id=generate_id(), job_id=data.job_id)
    app_dir = storage.base_dir / "applications" / app.id
    app_dir.mkdir(parents=True, exist_ok=True)
    storage.save_model(app_dir / "application.json", app)
    return app


@router.get("", response_model=list[ApplicationWithJob])
async def list_applications():
    results: list[ApplicationWithJob] = []
    apps_dir = storage.base_dir / "applications"
    if apps_dir.exists():
        for app_dir in sorted(apps_dir.iterdir(), reverse=True):
            app_path = app_dir / "application.json"
            if app_path.exists():
                app = storage.load_model(app_path, Application)
                if app:
                    job_title = ""
                    company = ""
                    job = storage.load_model(
                        storage.base_dir / "jobs" / app.job_id / "posting.json",
                        JobPosting,
                    )
                    if job:
                        job_title = job.title
                        company = job.company
                    results.append(
                        ApplicationWithJob(
                            application=app,
                            job_title=job_title,
                            company=company,
                        )
                    )
    return results


@router.get("/{app_id}", response_model=ApplicationWithJob)
async def get_application(app_id: str):
    app = storage.load_model(
        storage.base_dir / "applications" / app_id / "application.json", Application
    )
    if not app:
        raise HTTPException(404, "Application not found")

    job_title = ""
    company = ""
    job = storage.load_model(
        storage.base_dir / "jobs" / app.job_id / "posting.json", JobPosting
    )
    if job:
        job_title = job.title
        company = job.company

    return ApplicationWithJob(application=app, job_title=job_title, company=company)


@router.put("/{app_id}", response_model=Application)
async def update_application(app_id: str, data: ApplicationUpdate):
    app_path = storage.base_dir / "applications" / app_id / "application.json"
    app = storage.load_model(app_path, Application)
    if not app:
        raise HTTPException(404, "Application not found")

    if data.status is not None:
        app.status = data.status
    if data.notes is not None:
        app.notes = data.notes
    app.updated_at = datetime.now()

    storage.save_model(app_path, app)
    return app


@router.post("/{app_id}/follow-up", response_model=Application)
async def add_follow_up(app_id: str, data: FollowUpCreate):
    app_path = storage.base_dir / "applications" / app_id / "application.json"
    app = storage.load_model(app_path, Application)
    if not app:
        raise HTTPException(404, "Application not found")

    follow_up = FollowUp(type=data.type, notes=data.notes)
    app.follow_ups.append(follow_up)
    app.updated_at = datetime.now()

    storage.save_model(app_path, app)
    return app


@router.delete("/{app_id}")
async def delete_application(app_id: str):
    deleted = storage.delete_path(Path("applications") / app_id)
    if not deleted:
        raise HTTPException(404, "Application not found")
    return {"deleted": True}
