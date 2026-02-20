from datetime import datetime

from pydantic import BaseModel, Field

from job_applier.services.storage import generate_id


class ExtractedSkill(BaseModel):
    name: str
    required: bool = True
    category: str = ""


class JobPosting(BaseModel):
    id: str = Field(default_factory=generate_id)
    title: str = ""
    company: str = ""
    location: str = ""
    description: str = ""
    required_skills: list[ExtractedSkill] = []
    preferred_skills: list[ExtractedSkill] = []
    qualifications: list[str] = []
    responsibilities: list[str] = []
    salary: str = ""
    deadline: str = ""
    source_url: str = ""
    source_type: str = ""  # url, text, image
    raw_text: str = ""
    created_at: datetime = Field(default_factory=datetime.now)
