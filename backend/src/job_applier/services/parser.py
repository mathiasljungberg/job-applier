import mimetypes
from pathlib import Path

import httpx
import pdfplumber
from bs4 import BeautifulSoup
from docx import Document as DocxDocument

from job_applier.services.llm import llm


class ParserService:
    async def parse_pdf(self, file_path: Path) -> str:
        text_parts: list[str] = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        return "\n\n".join(text_parts)

    async def parse_docx(self, file_path: Path) -> str:
        doc = DocxDocument(str(file_path))
        return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())

    async def parse_url(self, url: str) -> str:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            response = await client.get(url)
            response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        # Remove script and style elements
        for element in soup(["script", "style", "nav", "footer", "header"]):
            element.decompose()
        return soup.get_text(separator="\n", strip=True)

    async def parse_image(self, image_data: bytes, media_type: str) -> str:
        return await llm.describe_image(
            image_data,
            media_type,
            "Extract all text content from this image. If it's a job posting, "
            "include all details about the position, requirements, and qualifications. "
            "Return the extracted text verbatim.",
        )

    async def parse_file(self, file_path: Path) -> str:
        suffix = file_path.suffix.lower()
        if suffix == ".pdf":
            return await self.parse_pdf(file_path)
        elif suffix in (".docx", ".doc"):
            return await self.parse_docx(file_path)
        elif suffix in (".txt", ".md"):
            return file_path.read_text(encoding="utf-8")
        else:
            raise ValueError(f"Unsupported file type: {suffix}")

    def detect_media_type(self, filename: str) -> str:
        mt, _ = mimetypes.guess_type(filename)
        return mt or "application/octet-stream"


parser = ParserService()
