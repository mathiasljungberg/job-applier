from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from job_applier.services.storage import generate_id

SkillCategory = Literal[
    "programming_languages",
    "frameworks",
    "devops",
    "soft_skills",
    "domain_knowledge",
    "tools",
    "certifications",
    "other",
]

SkillStatus = Literal["confirmed", "aspirational", "rejected"]
SkillSource = Literal["extracted", "manual", "gap_analysis"]


class Skill(BaseModel):
    id: str = Field(default_factory=generate_id)
    name: str
    category: SkillCategory = "other"
    proficiency: str = ""
    years_experience: float | None = None
    description: str = ""
    evidence: list[str] = []  # references to source documents
    tags: list[str] = []
    status: SkillStatus = "confirmed"
    source: SkillSource = "manual"
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class SkillLibrary(BaseModel):
    skills: list[Skill] = []
    updated_at: datetime = Field(default_factory=datetime.now)
