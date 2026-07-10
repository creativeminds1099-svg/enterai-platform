"""Append-only writer for raw_* landing tables.

Canonical enterai_* tables are never written by this module — only the
reconciler (via the approval gate) writes those. Collectors only ever call
`write_raw_rows`.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Iterable

logger = logging.getLogger("enterai.collectors.bq_writer")


def write_raw_rows(
    table_fqn: str,
    rows: Iterable[dict[str, Any]],
    dry_run: bool = False,
) -> int:
    rows = list(rows)
    if not rows:
        return 0

    if dry_run:
        logger.info(
            "dry_run.would_write", extra={"table": table_fqn, "row_count": len(rows)}
        )
        return len(rows)

    from .gcp_clients import bigquery_client

    client = bigquery_client()
    errors = client.insert_rows_json(table_fqn, rows)
    if errors:
        logger.error("bq.insert_errors", extra={"table": table_fqn, "errors": json.dumps(errors)})
        raise RuntimeError(f"BigQuery insert errors writing to {table_fqn}: {errors}")

    logger.info("bq.inserted", extra={"table": table_fqn, "row_count": len(rows)})
    return len(rows)
