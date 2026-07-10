"""Environment-driven configuration shared by all collectors.

Every collector Cloud Run Job reads the same env vars (set by
infra/terraform/cloud_run.tf), so a new collector needs zero new
configuration wiring.
"""
from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class CollectorConfig:
    project_id: str
    location: str
    bq_dataset_id: str
    dry_run: bool

    @classmethod
    def from_env(cls) -> "CollectorConfig":
        return cls(
            project_id=os.environ.get("GOOGLE_CLOUD_PROJECT", ""),
            location=os.environ.get("ENTERAI_LOCATION", "us-central1"),
            bq_dataset_id=os.environ.get("BQ_DATASET_ID", "enterai_registry"),
            dry_run=os.environ.get("ENTERAI_DRY_RUN", "false").lower() == "true",
        )
