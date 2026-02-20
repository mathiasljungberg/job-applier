from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from job_applier.models.document import Document
from job_applier.models.skill import Skill, SkillCategory, SkillLibrary, SkillSource, SkillStatus
from job_applier.services.extractor import extractor
from job_applier.services.storage import generate_id, storage

router = APIRouter(prefix="/api/skills", tags=["skills"])


class SkillCreate(BaseModel):
    name: str
    category: SkillCategory = "other"
    proficiency: str = ""
    years_experience: float | None = None
    description: str = ""
    tags: list[str] = []
    translations: dict[str, str] = {}
    status: SkillStatus = "confirmed"


class SkillUpdate(BaseModel):
    name: str | None = None
    category: SkillCategory | None = None
    proficiency: str | None = None
    years_experience: float | None = None
    description: str | None = None
    tags: list[str] | None = None
    translations: dict[str, str] | None = None
    status: SkillStatus | None = None


def _load_library() -> SkillLibrary:
    lib = storage.load_model(Path("skills/library.json"), SkillLibrary)
    return lib or SkillLibrary()


def _save_library(library: SkillLibrary) -> None:
    library.updated_at = datetime.now()
    storage.save_model(Path("skills/library.json"), library)


@router.get("", response_model=SkillLibrary)
async def list_skills():
    return _load_library()


@router.post("", response_model=Skill)
async def create_skill(data: SkillCreate):
    library = _load_library()

    # Prevent duplicates (case-insensitive)
    normalized = data.name.strip().lower()
    for existing in library.skills:
        if existing.name.strip().lower() == normalized:
            raise HTTPException(409, f"Skill '{existing.name}' already exists")

    skill = Skill(
        id=generate_id(),
        name=data.name,
        category=data.category,
        proficiency=data.proficiency,
        years_experience=data.years_experience,
        description=data.description,
        tags=data.tags,
        translations=data.translations,
        status=data.status,
        source="manual",
    )
    library.skills.append(skill)
    _save_library(library)
    return skill


@router.put("/{skill_id}", response_model=Skill)
async def update_skill(skill_id: str, data: SkillUpdate):
    library = _load_library()
    for skill in library.skills:
        if skill.id == skill_id:
            update_data = data.model_dump(exclude_none=True)
            for key, value in update_data.items():
                setattr(skill, key, value)
            skill.updated_at = datetime.now()
            _save_library(library)
            return skill
    raise HTTPException(404, "Skill not found")


@router.delete("/{skill_id}")
async def delete_skill(skill_id: str):
    library = _load_library()
    original_len = len(library.skills)
    library.skills = [s for s in library.skills if s.id != skill_id]
    if len(library.skills) == original_len:
        raise HTTPException(404, "Skill not found")
    _save_library(library)
    return {"deleted": True}


@router.post("/extract/{doc_id}", response_model=SkillLibrary)
async def extract_skills_from_document(doc_id: str):
    """Extract skills from a document and merge into the library."""
    doc = _find_document(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    skills = await extractor.extract_skills_from_text(doc.extracted_text, doc_id)
    if not skills:
        raise HTTPException(422, "No skills could be extracted from this document")
    library = extractor.merge_skills_into_library(skills)

    # Mark document as skills-extracted
    doc.skills_extracted = True
    subdir = "cvs" if doc.type == "cv" else "letters"
    storage.save_model(
        Path("library") / subdir / "metadata" / f"{doc_id}.json", doc
    )

    return library


def _find_document(doc_id: str) -> Document | None:
    for subdir in ("cvs", "letters"):
        path = Path("library") / subdir / "metadata" / f"{doc_id}.json"
        doc = storage.load_model(path, Document)
        if doc:
            return doc
    return None
