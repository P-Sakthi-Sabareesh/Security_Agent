"""Build the replay cache from saved memory-mode agent outputs without new model calls."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any, Dict, Iterable


ROOT = Path(__file__).resolve().parent.parent
ALERTS_FILE = ROOT / "data" / "alerts.json"
V2_MEMORY_FILE = ROOT / "results" / "v2" / "eval_memory.json"
DEMO_CACHE_FILE = ROOT / "results" / "demo_cache.json"
REPLAY_CACHE_FILE = ROOT / "results" / "replay_cache.json"


def _load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _commit_hash() -> str | None:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True, stderr=subprocess.DEVNULL
        ).strip()
    except Exception:
        return None


def _is_recorded(result: Any) -> bool:
    return (
        isinstance(result, dict)
        and result.get("state") in {"green", "yellow", "red"}
        and not result.get("error")
        and not result.get("fallback_rule")
    )


def make_entry(alert: Dict[str, Any], result: Dict[str, Any], source: str, commit_hash: str | None) -> Dict[str, Any]:
    best_match = result.get("best_match") if isinstance(result.get("best_match"), dict) else None
    recalled_cases = [case for case in result.get("recalled_cases", []) if isinstance(case, dict)]
    recalled_ids = [case.get("alert_id") for case in recalled_cases if case.get("alert_id")]
    if not recalled_ids:
        recalled_ids = result.get("llm_result", {}).get("recalled_case_ids", [])
    matches = best_match.get("matches", []) if best_match else []
    differences = best_match.get("differences", []) if best_match else []

    return {
        "alert_id": alert["alert_id"],
        "timestamp": alert.get("timestamp", ""),
        "title": alert.get("title", ""),
        "state": result["state"],
        "recalled_case_ids": recalled_ids,
        "best_match_id": result.get("best_match_id"),
        "matches_count": len(matches),
        "differences_count": len(differences),
        "model_used": result.get("llm_result", {}).get("model_used"),
        "git_commit": commit_hash,
        "source": source,
        "analysis": result,
    }


def load_existing_sources() -> Iterable[tuple[str, Dict[str, Any]]]:
    v2 = _load_json(V2_MEMORY_FILE, {})
    if isinstance(v2, dict):
        for alert_id, result in v2.items():
            yield alert_id, result

    demo_cache = _load_json(DEMO_CACHE_FILE, {})
    if isinstance(demo_cache, dict):
        for cache_key, result in demo_cache.items():
            if cache_key.endswith(":memory"):
                yield cache_key.removesuffix(":memory"), result


def build_cache() -> Dict[str, Any]:
    alerts = _load_json(ALERTS_FILE, [])
    replay_alerts = {
        alert["alert_id"]: alert
        for alert in alerts
        if alert.get("phase") == "replay" and alert.get("alert_id")
    }
    commit_hash = _commit_hash()
    entries: Dict[str, Dict[str, Any]] = {}

    for alert_id, result in load_existing_sources():
        alert = replay_alerts.get(alert_id)
        if alert and _is_recorded(result):
            source = "demo_cache" if alert_id in {
                key.removesuffix(":memory")
                for key in _load_json(DEMO_CACHE_FILE, {}).keys()
                if key.endswith(":memory")
            } else "v2_eval_memory"
            entries[alert_id] = make_entry(alert, result, source, commit_hash)

    ordered_entries = sorted(entries.values(), key=lambda entry: (entry["timestamp"], entry["alert_id"]))
    cached_ids = set(entries)
    return {
        "recorded_from": ["results/v2/eval_memory.json", "results/demo_cache.json"],
        "total_replay_alerts": len(replay_alerts),
        "recorded_count": len(ordered_entries),
        "git_commit": commit_hash,
        "entries": ordered_entries,
        "uncached_alert_ids": [
            alert_id
            for alert_id, _ in sorted(replay_alerts.items(), key=lambda pair: pair[1].get("timestamp", ""))
            if alert_id not in cached_ids
        ],
        "not_run": [],
    }


def main() -> None:
    cache = build_cache()
    temp_file = REPLAY_CACHE_FILE.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as handle:
        json.dump(cache, handle, indent=2)
    temp_file.replace(REPLAY_CACHE_FILE)
    print(f"Recorded {cache['recorded_count']} of {cache['total_replay_alerts']} replay alerts.")


if __name__ == "__main__":
    main()
