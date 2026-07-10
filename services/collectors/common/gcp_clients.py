"""Thin, lazily-constructed wrappers around the Google Cloud client
libraries each collector needs. Kept in one place so every collector
authenticates and retries the same way, and so tests can monkeypatch a
single factory function instead of five different client constructors.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Any


@lru_cache(maxsize=1)
def bigquery_client() -> Any:
    from google.cloud import bigquery

    return bigquery.Client()


@lru_cache(maxsize=1)
def asset_client() -> Any:
    from google.cloud import asset_v1

    return asset_v1.AssetServiceClient()


@lru_cache(maxsize=1)
def logging_client() -> Any:
    from google.cloud import logging as cloud_logging

    return cloud_logging.Client()


def agent_registry_request(project_id: str, location: str, resource: str) -> Any:
    """Google Cloud Agent Registry is Preview-stage and, as of this
    writing, primarily exposed through `gcloud alpha agent-registry` and a
    REST surface rather than a stable client library. This helper issues a
    plain authenticated REST call so the collector doesn't depend on a
    library that may not be GA in every environment yet.

    resource: one of "agents", "mcpServers", "endpoints"
    """
    import google.auth
    import google.auth.transport.requests
    import requests

    credentials, _ = google.auth.default(
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    credentials.refresh(google.auth.transport.requests.Request())

    url = (
        f"https://agentregistry.googleapis.com/v1alpha/"
        f"projects/{project_id}/locations/{location}/{resource}"
    )
    resp = requests.get(
        url,
        headers={"Authorization": f"Bearer {credentials.token}"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def reasoning_engines_request(project_id: str, location: str) -> Any:
    """Vertex AI Agent Engine / Reasoning Engines REST list call."""
    import google.auth
    import google.auth.transport.requests
    import requests

    credentials, _ = google.auth.default(
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    credentials.refresh(google.auth.transport.requests.Request())

    url = (
        f"https://{location}-aiplatform.googleapis.com/v1beta1/"
        f"projects/{project_id}/locations/{location}/reasoningEngines"
    )
    resp = requests.get(
        url,
        headers={"Authorization": f"Bearer {credentials.token}"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()
