from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from job_applier.services.storage import generate_id

ApplicationStatus = Literal[
    "draft",
    "ready",
    "applied",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
]


class FollowUp(BaseModel):
    date: datetime = Field(default_factory=datetime.now)
    type: str = ""  # email, phone, linkedin, etc.
    notes: str = ""


class GenerationConfig(BaseModel):
    template: str = "default"
    char_limit: int | None = None
    language: str = "en"
    tone: str = "professional"


class Application(BaseModel):
    id: str = Field(default_factory=generate_id)
    job_id: str
    status: ApplicationStatus = "draft"
    generation_config: GenerationConfig = Field(default_factory=GenerationConfig)
    cv_path: str = ""
    letter_path: str = ""
    follow_ups: list[FollowUp] = []
    notes: str = ""
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
