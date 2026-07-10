#!/usr/bin/env python3
"""Runs raw_to_canonical.sql against the configured project/dataset.
Intended to run as a Cloud Run Job or Cloud Composer/Workflows step between
the collector schedule and the reconciler schedule.
"""
from __future__ import annotations

import os
from pathlib import Path


def run() -> None:
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
    dataset_id = os.environ.get("BQ_DATASET_ID", "enterai_registry")
    dataset = f"{project_id}.{dataset_id}"

    sql_path = Path(__file__).parent / "raw_to_canonical.sql"
    sql = sql_path.read_text().replace("@dataset", dataset)

    from google.cloud import bigquery

    client = bigquery.Client(project=project_id)
    for statement in [s.strip() for s in sql.split(";") if s.strip() and not s.strip().startswith("--")]:
        client.query(statement).result()


if __name__ == "__main__":
    run()
