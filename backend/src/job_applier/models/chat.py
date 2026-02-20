from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)


class ChatHistory(BaseModel):
    application_id: str
    messages: list[ChatMessage] = []
