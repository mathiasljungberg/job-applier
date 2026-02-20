from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from job_applier.models.application import Application, GenerationConfig
from job_applier.models.job import JobPosting
from job_applier.models.skill import SkillLibrary
from job_applier.prompts.generation import CV_GENERATION_PROMPT, LETTER_GENERATION_PROMPT
from job_applier.services.llm import llm
from job_applier.services.storage import storage

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))


class GeneratorService:
    async def generate_document(
        self,
        doc_type: str,
        job: JobPosting,
        library: SkillLibrary,
        config: GenerationConfig,
        application_id: str,
    ) -> str:
        """Generate a document (cv or letter) and return HTML content."""
        requirements = []
        for s in job.required_skills:
            requirements.append(f"- [Required] {s.name}")
        for s in job.preferred_skills:
            requirements.append(f"- [Preferred] {s.name}")
        for q in job.qualifications:
            requirements.append(f"- {q}")

        skills_text = []
        for s in library.skills:
            if s.status == "confirmed":
                display_name = s.translations.get(config.language, s.name)
                line = f"- {display_name}"
                if s.proficiency:
                    line += f" ({s.proficiency})"
                if s.description:
                    line += f": {s.description}"
                skills_text.append(line)

        char_limit_instruction = ""
        if config.char_limit:
            char_limit_instruction = (
                f"IMPORTANT: Keep the total text content under {config.char_limit} characters."
            )

        template = (
            CV_GENERATION_PROMPT if doc_type == "cv" else LETTER_GENERATION_PROMPT
        )

        prompt = template.format(
            job_title=job.title,
            company=job.company,
            requirements="\n".join(requirements),
            skills="\n".join(skills_text) or "(no confirmed skills)",
            tone=config.tone,
            language=config.language,
            char_limit_instruction=char_limit_instruction,
        )

        content_html = await llm.generate_text(prompt, max_tokens=4096)

        # Clean up: remove markdown code fences if present
        if content_html.startswith("```"):
            lines = content_html.split("\n")
            content_html = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])

        # Save HTML
        app_dir = Path("applications") / application_id
        html_path = app_dir / f"{doc_type}.html"
        storage.save_file(html_path, content_html.encode("utf-8"))

        return content_html

    def render_full_html(self, content_html: str) -> str:
        """Wrap content in the full HTML template."""
        template = env.get_template("document.html")
        return template.render(content=content_html)

    def generate_pdf(self, full_html: str, output_path: Path) -> Path:
        """Convert HTML to PDF using weasyprint."""
        full_path = storage.base_dir / output_path if not output_path.is_absolute() else output_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        HTML(string=full_html).write_pdf(str(full_path))
        return full_path


generator = GeneratorService()
