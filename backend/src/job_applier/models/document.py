from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from job_applier.services.storage import generate_id

DocumentType = Literal["cv", "letter"]


class Document(BaseModel):
    id: str = Field(default_factory=generate_id)
    type: DocumentType
    filename: str
    original_path: str = ""
    extracted_text: str = ""
    skills_extracted: bool = False
    created_at: datetime = Field(default_factory=datetime.now)
