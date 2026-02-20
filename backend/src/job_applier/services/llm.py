from collections.abc import AsyncIterator
from typing import TypeVar

from pydantic import BaseModel

from job_applier.config import settings
from job_applier.services.providers.base import LLMProvider

T = TypeVar("T", bound=BaseModel)

_provider: LLMProvider | None = None


def get_provider() -> LLMProvider:
    global _provider
    if _provider is None:
        if settings.llm_provider == "anthropic":
            from job_applier.services.providers.anthropic import AnthropicProvider
            _provider = AnthropicProvider()
        elif settings.llm_provider == "openai":
            from job_applier.services.providers.openai import OpenAIProvider
            _provider = OpenAIProvider()
        else:
            raise ValueError(f"Unknown LLM provider: {settings.llm_provider}")
    return _provider


class LLMService:
    @property
    def provider(self) -> LLMProvider:
        return get_provider()

    async def extract_structured(
        self, prompt: str, schema: type[T], model: str | None = None
    ) -> T:
        return await self.provider.extract_structured(prompt, schema, model)

    async def generate_text(
        self, prompt: str, max_tokens: int = 4096, model: str | None = None
    ) -> str:
        return await self.provider.generate_text(prompt, max_tokens, model)

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        system: str = "",
        model: str | None = None,
    ) -> AsyncIterator[str]:
        async for token in self.provider.stream_chat(messages, system, model):
            yield token

    async def describe_image(
        self, image_data: bytes, media_type: str, prompt: str, model: str | None = None
    ) -> str:
        return await self.provider.describe_image(image_data, media_type, prompt, model)


llm = LLMService()
