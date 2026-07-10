#!/usr/bin/env python3
"""Verifies the fixture data under apps/api/src/fixtures is internally
consistent (every foreign key in the sample data actually resolves). This
is the same sample data the API serves in ENTERAI_USE_FIXTURES=true mode
(the default for local dev) -- this script is a sanity check you can run
after hand-editing a fixture file, not a database seeding step.
"""
from __future__ import annotations

import json
from pathlib import Path

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "apps" / "api" / "src" / "fixtures"


def load(name: str):
    with open(FIXTURES_DIR / f"{name}.json") as f:
        return json.load(f)


def main() -> None:
    agents = load("agents.json")
    initiatives = load("initiatives.json")
    edges = load("dependency_edges.json")
    owners = load("owners.json")

    agent_ids = {a["agent_id"] for a in agents}
    initiative_ids = {i["initiative_id"] for i in initiatives}
    owner_ids = {o["owner_id"] for o in owners}

    problems = []

    for a in agents:
        if a.get("initiative_id") and a["initiative_id"] not in initiative_ids:
            problems.append(f"agent {a['agent_id']} references missing initiative {a['initiative_id']}")
        if a.get("owner_id") and a["owner_id"] not in owner_ids:
            problems.append(f"agent {a['agent_id']} references missing owner {a['owner_id']}")

    for i in initiatives:
        for aid in i["agent_ids"]:
            if aid not in agent_ids:
                problems.append(f"initiative {i['initiative_id']} references missing agent {aid}")

    for e in edges:
        if e["from_entity_type"] == "agent" and e["from_entity_id"] not in agent_ids:
            problems.append(f"edge {e['edge_id']} references missing agent {e['from_entity_id']}")
        if e["to_entity_type"] == "agent" and e["to_entity_id"] not in agent_ids:
            problems.append(f"edge {e['edge_id']} references missing agent {e['to_entity_id']}")

    if problems:
        print(f"Found {len(problems)} fixture consistency problems:")
        for p in problems:
            print(f"  - {p}")
        raise SystemExit(1)

    print(f"OK: {len(agents)} agents, {len(initiatives)} initiatives, {len(edges)} edges — all references resolve.")


if __name__ == "__main__":
    main()
