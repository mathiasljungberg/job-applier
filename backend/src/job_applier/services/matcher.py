from pydantic import BaseModel

from job_applier.models.job import JobPosting
from job_applier.models.skill import SkillLibrary
from job_applier.prompts.matching import SKILL_MATCHING_PROMPT
from job_applier.services.llm import llm


class SkillMatch(BaseModel):
    requirement: str
    matched_skill_id: str = ""
    matched_skill_name: str = ""
    match_quality: str = "none"  # strong, partial, none
    explanation: str = ""


class MatchResult(BaseModel):
    matches: list[SkillMatch]


class MatchResponse(BaseModel):
    job_id: str
    job_title: str
    matches: list[SkillMatch]
    match_rate: float
    strong_matches: int
    partial_matches: int
    gaps: int


class MatcherService:
    async def match_skills(
        self, job: JobPosting, library: SkillLibrary
    ) -> MatchResponse:
        # Build requirement list
        all_requirements = []
        for s in job.required_skills:
            all_requirements.append(f"[REQUIRED] {s.name}")
        for s in job.preferred_skills:
            all_requirements.append(f"[PREFERRED] {s.name}")

        # Build skill list
        skill_lines = []
        for s in library.skills:
            if s.status != "rejected":
                skill_lines.append(
                    f"ID: {s.id} | Name: {s.name} | Category: {s.category} | "
                    f"Proficiency: {s.proficiency}"
                )

        prompt = SKILL_MATCHING_PROMPT.format(
            requirements="\n".join(all_requirements),
            skills="\n".join(skill_lines) or "(no skills in library)",
        )

        result = await llm.extract_structured(prompt, MatchResult)

        strong = sum(1 for m in result.matches if m.match_quality == "strong")
        partial = sum(1 for m in result.matches if m.match_quality == "partial")
        gaps = sum(1 for m in result.matches if m.match_quality == "none")
        total = len(result.matches)

        return MatchResponse(
            job_id=job.id,
            job_title=job.title,
            matches=result.matches,
            match_rate=(strong + partial * 0.5) / total if total > 0 else 0,
            strong_matches=strong,
            partial_matches=partial,
            gaps=gaps,
        )


matcher = MatcherService()
