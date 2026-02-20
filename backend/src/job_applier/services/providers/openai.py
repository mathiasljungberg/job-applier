import base64
import json
from collections.abc import AsyncIterator
from typing import TypeVar

from openai import AsyncOpenAI
from pydantic import BaseModel

from job_applier.config import settings
from job_applier.services.providers.base import LLMProvider
from job_applier.services.usage import usage_tracker

T = TypeVar("T", bound=BaseModel)


class OpenAIProvider(LLMProvider):
    def __init__(self) -> None:
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.default_model = "gpt-4o"
        self.extraction_model = "gpt-4o-mini"

    async def extract_structured(
        self, prompt: str, schema: type[T], model: str | None = None
    ) -> T:
        model = model or self.extraction_model
        response = await self.client.responses.parse(
            model=model,
            input=[{"role": "user", "content": prompt}],
            text_format=schema,
        )
        if response.usage:
            usage_tracker.record(
                "openai", model, "extract",
                response.usage.input_tokens, response.usage.output_tokens,
            )
        result = response.output_parsed
        if result is None:
            raise ValueError("No structured output returned")
        return result

    async def generate_text(
        self, prompt: str, max_tokens: int = 4096, model: str | None = None
    ) -> str:
        model = model or self.default_model
        response = await self.client.responses.create(
            model=model,
            input=[{"role": "user", "content": prompt}],
            max_output_tokens=max_tokens,
        )
        if response.usage:
            usage_tracker.record(
                "openai", model, "generate",
                response.usage.input_tokens, response.usage.output_tokens,
            )
        return response.output_text

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        system: str = "",
        model: str | None = None,
    ) -> AsyncIterator[str]:
        model = model or self.default_model
        input_messages: list[dict] = []
        if system:
            input_messages.append({"role": "system", "content": system})
        input_messages.extend(messages)

        stream = self.client.responses.stream(
            model=model,
            input=input_messages,
        )
        async with stream as s:
            async for event in s:
                if hasattr(event, "delta") and isinstance(event.delta, str):
                    yield event.delta
            response = await s.get_final_response()
            if response.usage:
                usage_tracker.record(
                    "openai", model, "chat",
                    response.usage.input_tokens, response.usage.output_tokens,
                )

    async def describe_image(
        self, image_data: bytes, media_type: str, prompt: str, model: str | None = None
    ) -> str:
        model = model or self.default_model
        b64 = base64.b64encode(image_data).decode()
        response = await self.client.responses.create(
            model=model,
            input=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_image",
                            "image_url": f"data:{media_type};base64,{b64}",
                        },
                        {"type": "input_text", "text": prompt},
                    ],
                }
            ],
        )
        if response.usage:
            usage_tracker.record(
                "openai", model, "image",
                response.usage.input_tokens, response.usage.output_tokens,
            )
        return response.output_text
