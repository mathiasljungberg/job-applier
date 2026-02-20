import json
from datetime import datetime
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

from job_applier.config import settings

OperationType = Literal["extract", "generate", "chat", "image"]

# Cost per 1M tokens (input, output)
PRICING: dict[str, tuple[float, float]] = {
    "claude-haiku-4-5-20251001": (0.80, 4.00),
    "claude-sonnet-4-6": (3.00, 15.00),
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4o": (2.50, 10.00),
}


class UsageRecord(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.now)
    provider: str
    model: str
    operation: OperationType
    input_tokens: int
    output_tokens: int
    estimated_cost: float = 0.0


class UsageSummary(BaseModel):
    total_calls: int = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_cost: float = 0.0
    by_model: dict[str, dict] = {}


class UsageTracker:
    def __init__(self) -> None:
        self._log_path = settings.data_dir / "usage" / "log.json"
        self._records: list[UsageRecord] = []
        self._load()

    def _load(self) -> None:
        if self._log_path.exists():
            try:
                data = json.loads(self._log_path.read_text(encoding="utf-8"))
                self._records = [UsageRecord.model_validate(r) for r in data]
            except Exception:
                self._records = []

    def _persist(self) -> None:
        self._log_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self._log_path.with_suffix(".tmp")
        tmp.write_text(
            json.dumps(
                [r.model_dump(mode="json") for r in self._records],
                indent=2,
                default=str,
            ),
            encoding="utf-8",
        )
        tmp.replace(self._log_path)

    def _estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        # Try exact match first, then prefix match
        pricing = PRICING.get(model)
        if not pricing:
            for key, val in PRICING.items():
                if model.startswith(key.rsplit("-", 1)[0]):
                    pricing = val
                    break
        if not pricing:
            return 0.0
        input_cost, output_cost = pricing
        return (input_tokens * input_cost + output_tokens * output_cost) / 1_000_000

    def record(
        self,
        provider: str,
        model: str,
        operation: OperationType,
        input_tokens: int,
        output_tokens: int,
    ) -> None:
        cost = self._estimate_cost(model, input_tokens, output_tokens)
        rec = UsageRecord(
            provider=provider,
            model=model,
            operation=operation,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=cost,
        )
        self._records.append(rec)
        self._persist()

    def get_records(self, since: datetime | None = None) -> list[UsageRecord]:
        if since is None:
            return list(self._records)
        return [r for r in self._records if r.timestamp >= since]

    def get_summary(self) -> UsageSummary:
        summary = UsageSummary()
        for r in self._records:
            summary.total_calls += 1
            summary.total_input_tokens += r.input_tokens
            summary.total_output_tokens += r.output_tokens
            summary.total_cost += r.estimated_cost

            if r.model not in summary.by_model:
                summary.by_model[r.model] = {
                    "calls": 0,
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "cost": 0.0,
                }
            entry = summary.by_model[r.model]
            entry["calls"] += 1
            entry["input_tokens"] += r.input_tokens
            entry["output_tokens"] += r.output_tokens
            entry["cost"] += r.estimated_cost

        return summary


usage_tracker = UsageTracker()
