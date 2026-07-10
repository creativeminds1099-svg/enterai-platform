"""Near-duplicate agent detection.

Flags two registered agents as probable duplicates when their name,
function area, and declared tool/model dependencies are highly similar --
the pattern the blog post calls out: "two agents with near-identical names,
prompts, and tool dependencies are very likely a duplicate build that
nobody caught before funding it twice."

Deliberately simple (token-overlap Jaccard similarity) rather than an
embedding model, so this runs cheaply as part of a scheduled reconciler
pass without a model-serving dependency. Swap in a Vertex AI embedding
similarity call here if higher recall is needed.
"""
from __future__ import annotations

import re


def _tokenize(agent: dict) -> set[str]:
    text = " ".join(
        [
            agent.get("name", ""),
            agent.get("function_area", "") or "",
            " ".join(agent.get("model_ids", []) or []),
            " ".join(agent.get("mcp_server_ids", []) or []),
            " ".join(agent.get("connector_ids", []) or []),
        ]
    ).lower()
    return set(re.findall(r"[a-z0-9]+", text))


def similarity(agent_a: dict, agent_b: dict) -> float:
    tokens_a, tokens_b = _tokenize(agent_a), _tokenize(agent_b)
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = len(tokens_a & tokens_b)
    union = len(tokens_a | tokens_b)
    return intersection / union if union else 0.0
