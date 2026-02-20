from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LLMProvider(ABC):
    @abstractmethod
    async def extract_structured(
        self, prompt: str, schema: type[T], model: str | None = None
    ) -> T:
        """Extract structured data from text using a Pydantic schema."""

    @abstractmethod
    async def generate_text(
        self, prompt: str, max_tokens: int = 4096, model: str | None = None
    ) -> str:
        """Generate free-form text."""

    @abstractmethod
    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        system: str = "",
        model: str | None = None,
    ) -> AsyncIterator[str]:
        """Stream chat completion tokens."""

    @abstractmethod
    async def describe_image(
        self, image_data: bytes, media_type: str, prompt: str, model: str | None = None
    ) -> str:
        """Describe or extract info from an image."""
