import json
import shutil
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel
from ulid import ULID

from job_applier.config import settings

T = TypeVar("T", bound=BaseModel)


def generate_id() -> str:
    return str(ULID())


class StorageService:
    def __init__(self, base_dir: Path | None = None):
        self.base_dir = base_dir or settings.data_dir
        self._ensure_directories()

    def _ensure_directories(self) -> None:
        dirs = [
            self.base_dir / "library" / "cvs" / "originals",
            self.base_dir / "library" / "cvs" / "metadata",
            self.base_dir / "library" / "letters" / "originals",
            self.base_dir / "library" / "letters" / "metadata",
            self.base_dir / "skills",
            self.base_dir / "jobs",
            self.base_dir / "applications",
        ]
        for d in dirs:
            d.mkdir(parents=True, exist_ok=True)

    def read_json(self, path: Path) -> dict | list | None:
        full_path = self.base_dir / path if not path.is_absolute() else path
        if not full_path.exists():
            return None
        return json.loads(full_path.read_text(encoding="utf-8"))

    def write_json(self, path: Path, data: dict | list) -> None:
        full_path = self.base_dir / path if not path.is_absolute() else path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = full_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
        tmp.replace(full_path)

    def save_model(self, path: Path, model: BaseModel) -> None:
        self.write_json(path, model.model_dump(mode="json"))

    def load_model(self, path: Path, model_class: type[T]) -> T | None:
        data = self.read_json(path)
        if data is None:
            return None
        return model_class.model_validate(data)

    def list_json_files(self, directory: Path) -> list[Path]:
        full_dir = self.base_dir / directory if not directory.is_absolute() else directory
        if not full_dir.exists():
            return []
        return sorted(full_dir.glob("*.json"))

    def save_file(self, path: Path, content: bytes) -> Path:
        full_path = self.base_dir / path if not path.is_absolute() else path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(content)
        return full_path

    def delete_path(self, path: Path) -> bool:
        full_path = self.base_dir / path if not path.is_absolute() else path
        if not full_path.exists():
            return False
        if full_path.is_dir():
            shutil.rmtree(full_path)
        else:
            full_path.unlink()
        return True

    def exists(self, path: Path) -> bool:
        full_path = self.base_dir / path if not path.is_absolute() else path
        return full_path.exists()


storage = StorageService()
