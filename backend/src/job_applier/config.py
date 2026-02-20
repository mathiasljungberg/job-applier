from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings


PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


class Settings(BaseSettings):
    model_config = {
        "env_file": [
            str(PROJECT_ROOT / ".env"),   # project root .env
            ".env",                        # cwd fallback
        ],
        "env_file_encoding": "utf-8",
    }

    # LLM provider
    llm_provider: Literal["anthropic", "openai"] = "anthropic"
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # Model selection
    extraction_model: str = "claude-haiku-4-5-20251001"
    generation_model: str = "claude-sonnet-4-6"
    chat_model: str = "claude-sonnet-4-6"

    # Data directory
    data_dir: Path = Path(__file__).resolve().parent.parent.parent.parent / "data"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True


settings = Settings()
