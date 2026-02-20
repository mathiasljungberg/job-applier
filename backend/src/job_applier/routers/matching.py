from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from job_applier.models.job import JobPosting
from job_applier.models.skill import SkillLibrary
from job_applier.services.matcher import MatchResponse, matcher
from job_applier.services.storage import storage

router = APIRouter(prefix="/api", tags=["matching"])


class MatchRequest(BaseModel):
    job_id: str


@router.post("/match", response_model=MatchResponse)
async def match_skills(data: MatchRequest):
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

    return await matcher.match_skills(job, library)
