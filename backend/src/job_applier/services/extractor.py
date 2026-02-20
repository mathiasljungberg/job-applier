from datetime import datetime
from pathlib import Path

from pydantic import BaseModel

from job_applier.models.job import JobPosting
from job_applier.models.skill import Skill, SkillLibrary
from job_applier.prompts.extraction import JOB_EXTRACTION_PROMPT, SKILL_EXTRACTION_PROMPT
from job_applier.services.llm import llm
from job_applier.services.storage import generate_id, storage


class ExtractedSkillItem(BaseModel):
    name: str
    category: str = "other"
    proficiency: str = ""
    years_experience: float | None = None
    description: str = ""
    tags: list[str] = []


class ExtractedSkills(BaseModel):
    skills: list[ExtractedSkillItem]


class ExtractorService:
    async def extract_skills_from_text(
        self, text: str, source_doc_id: str = ""
    ) -> list[Skill]:
        prompt = SKILL_EXTRACTION_PROMPT.format(text=text)
        result = await llm.extract_structured(prompt, ExtractedSkills)

        skills = []
        for item in result.skills:
            skill = Skill(
                id=generate_id(),
                name=item.name,
                category=item.category if item.category in (
                    "programming_languages", "frameworks", "devops",
                    "soft_skills", "domain_knowledge", "tools",
                    "certifications", "other"
                ) else "other",
                proficiency=item.proficiency,
                years_experience=item.years_experience,
                description=item.description,
                evidence=[source_doc_id] if source_doc_id else [],
                tags=item.tags,
                status="confirmed",
                source="extracted",
            )
            skills.append(skill)
        return skills

    async def extract_job_posting(self, text: str) -> JobPosting:
        prompt = JOB_EXTRACTION_PROMPT.format(text=text)
        return await llm.extract_structured(prompt, JobPosting)

    def merge_skills_into_library(self, new_skills: list[Skill]) -> SkillLibrary:
        library = self._load_library()
        existing_names = {s.name.lower() for s in library.skills}

        for skill in new_skills:
            if skill.name.lower() not in existing_names:
                library.skills.append(skill)
                existing_names.add(skill.name.lower())

        library.updated_at = datetime.now()
        self._save_library(library)
        return library

    def _load_library(self) -> SkillLibrary:
        lib = storage.load_model(Path("skills/library.json"), SkillLibrary)
        return lib or SkillLibrary()

    def _save_library(self, library: SkillLibrary) -> None:
        storage.save_model(Path("skills/library.json"), library)


extractor = ExtractorService()
