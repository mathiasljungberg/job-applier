import base64
import json
from collections.abc import AsyncIterator
from typing import TypeVar

import anthropic
from pydantic import BaseModel

from job_applier.config import settings
from job_applier.services.providers.base import LLMProvider

T = TypeVar("T", bound=BaseModel)


class AnthropicProvider(LLMProvider):
    def __init__(self) -> None:
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.default_model = settings.generation_model

    async def extract_structured(
        self, prompt: str, schema: type[T], model: str | None = None
    ) -> T:
        model = model or settings.extraction_model
        json_schema = schema.model_json_schema()

        response = await self.client.messages.create(
            model=model,
            max_tokens=4096,
            tools=[
                {
                    "name": "extract",
                    "description": "Extract structured data from the provided text.",
                    "input_schema": json_schema,
                }
            ],
            tool_choice={"type": "tool", "name": "extract"},
            messages=[{"role": "user", "content": prompt}],
        )

        for block in response.content:
            if block.type == "tool_use":
                return schema.model_validate(block.input)

        raise ValueError("No tool use block in response")

    async def generate_text(
        self, prompt: str, max_tokens: int = 4096, model: str | None = None
    ) -> str:
        model = model or self.default_model
        response = await self.client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        system: str = "",
        model: str | None = None,
    ) -> AsyncIterator[str]:
        model = model or settings.chat_model
        kwargs: dict = {
            "model": model,
            "max_tokens": 4096,
            "messages": messages,
        }
        if system:
            kwargs["system"] = system

        async with self.client.messages.stream(**kwargs) as stream:
            async for text in stream.text_stream:
                yield text

    async def describe_image(
        self, image_data: bytes, media_type: str, prompt: str, model: str | None = None
    ) -> str:
        model = model or self.default_model
        b64 = base64.b64encode(image_data).decode()
        response = await self.client.messages.create(
            model=model,
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )
        return response.content[0].text
