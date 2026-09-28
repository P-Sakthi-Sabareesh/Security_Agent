"""Extend the replay cache sequentially with real memory-mode agent runs when requested."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional


ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agent.soc_agent import SOCMemoryAgent
from scripts.build_replay_cache import ALERTS_FILE, REPLAY_CACHE_FILE, build_cache, make_entry


PACING_SECONDS = 3.0
MAX_RETRY_AFTER_ATTEMPTS = 3


def _load_cache() -> Dict[str, Any]:
    if not REPLAY_CACHE_FILE.exists():
        return build_cache()
    with open(REPLAY_CACHE_FILE, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _save_cache(cache: Dict[str, Any]) -> None:
    temp_file = REPLAY_CACHE_FILE.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as handle:
        json.dump(cache, handle, indent=2)
    temp_file.replace(REPLAY_CACHE_FILE)


def _retry_after_seconds(error: Exception) -> Optional[float]:
    headers = getattr(getattr(error, "response", None), "headers", {}) or {}
    value = headers.get("Retry-After") or headers.get("retry-after")
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _is_daily_quota(error: Exception) -> bool:
    message = str(error).lower()
    return any(marker in message for marker in ("daily quota", "daily limit", "tokens per day", "tpd"))


def main() -> None:
    cache = _load_cache()
    alerts = json.loads(ALERTS_FILE.read_text(encoding="utf-8"))
    replay_alerts = sorted(
        (alert for alert in alerts if alert.get("phase") == "replay"),
        key=lambda alert: (alert.get("timestamp", ""), alert.get("alert_id", "")),
    )
    entries = {entry["alert_id"]: entry for entry in cache.get("entries", [])}
    pending = [alert for alert in replay_alerts if alert.get("alert_id") not in entries]
    if not pending:
        print("Replay cache is already complete.")
        return

    agent = SOCMemoryAgent()
    try:
        for index, alert in enumerate(pending):
            alert_id = alert["alert_id"]
            for attempt in range(MAX_RETRY_AFTER_ATTEMPTS + 1):
                try:
                    result = agent.analyze_alert(alert)
                    if result.get("state") not in {"green", "yellow", "red"} or result.get("fallback_rule"):
                        raise RuntimeError("Agent did not return a recordable classification.")
                    entries[alert_id] = make_entry(alert, result, "warm_replay", cache.get("git_commit"))
                    cache["entries"] = sorted(entries.values(), key=lambda entry: (entry["timestamp"], entry["alert_id"]))
                    cache["recorded_count"] = len(cache["entries"])
                    cache["uncached_alert_ids"] = [item["alert_id"] for item in pending[index + 1:]]
                    _save_cache(cache)
                    print(f"[{cache['recorded_count']}/{cache['total_replay_alerts']}] {alert_id}: {result['state']}")
                    break
                except Exception as error:
                    if _is_daily_quota(error):
                        remaining = pending[index:]
                        cache["not_run"] = [
                            {"alert_id": item["alert_id"], "status": "NOT RUN", "reason": "Groq daily quota exhausted"}
                            for item in remaining
                        ]
                        cache["uncached_alert_ids"] = [item["alert_id"] for item in remaining]
                        _save_cache(cache)
                        print("Groq daily quota exhausted. Remaining alerts marked NOT RUN.")
                        return
                    retry_after = _retry_after_seconds(error)
                    if retry_after is not None and attempt < MAX_RETRY_AFTER_ATTEMPTS:
                        print(f"{alert_id}: honoring Retry-After for {retry_after:.0f}s.")
                        time.sleep(retry_after)
                        continue
                    print(f"{alert_id}: not recorded ({error}).")
                    break
            if index < len(pending) - 1:
                time.sleep(PACING_SECONDS)
    finally:
        agent.close()


if __name__ == "__main__":
    main()
