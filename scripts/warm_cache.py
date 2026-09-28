#!/usr/bin/env python3
"""
Hindy SOC Memory Agent - Cache Warming Script
Pre-computes and saves analysis results for key demo alerts:
- ALRT-00661
- ALRT-00662
- ALRT-00663
for both Memory and No-Memory modes into results/demo_cache.json.
Paced at 1 request every 3 seconds.
"""

import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict

# Add workspace root to sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from agent.soc_agent import (
    DEFAULT_ALERTS_PATH,
    SOCMemoryAgent,
    load_alert,
)

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
logger = logging.getLogger("warm_cache")

DEMO_ALERT_IDS = ["ALRT-00661", "ALRT-00662", "ALRT-00663"]
RESULTS_DIR = WORKSPACE_ROOT / "results"
DEMO_CACHE_FILE = RESULTS_DIR / "demo_cache.json"
PACING_SECONDS = 3.0


def _load_history_metadata() -> Dict[str, Dict[str, Any]]:
    if not DEFAULT_ALERTS_PATH.exists():
        return {}
    with open(DEFAULT_ALERTS_PATH, "r", encoding="utf-8") as f:
        alerts = json.load(f)
    return {
        a["alert_id"]: a
        for a in alerts
        if a.get("phase") == "history" and "alert_id" in a
    }


def main():
    print("=" * 70)
    print("HINDY SOC MEMORY AGENT: PRE-WARMING DEMO CACHE")
    print(f"Target Alerts: {DEMO_ALERT_IDS}")
    print(f"Modes: memory, nomemory")
    print(f"Pacing: {PACING_SECONDS}s per request")
    print("=" * 70)

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Load existing cache
    cache: Dict[str, Any] = {}
    if DEMO_CACHE_FILE.exists():
        try:
            with open(DEMO_CACHE_FILE, "r", encoding="utf-8") as f:
                cache = json.load(f)
        except Exception:
            cache = {}

    history_meta = _load_history_metadata()
    agent = SOCMemoryAgent()

    try:
        for aid in DEMO_ALERT_IDS:
            alert = load_alert(aid)
            
            # 1. Warm Memory Mode
            mem_key = f"{aid}:memory"
            if mem_key in cache and not cache[mem_key].get("error"):
                print(f"[CACHE HIT] {mem_key} is already warmed.")
            else:
                print(f"[WARMING] Computing {mem_key}...")
                start_t = time.time()
                try:
                    res = agent.analyze_alert(alert)
                    elapsed = time.time() - start_t
                    res["elapsed_seconds"] = round(elapsed, 3)
                    
                    # Enrich with real historical date/timestamp
                    if "recalled_cases" in res:
                        for c in res["recalled_cases"]:
                            cid = c.get("alert_id")
                            if cid in history_meta:
                                c["timestamp"] = history_meta[cid].get("timestamp")
                                c["day"] = history_meta[cid].get("day")
                                c["mitre_technique"] = history_meta[cid].get("mitre_technique")
                    if res.get("best_match") and res["best_match"].get("alert_id") in history_meta:
                        b_id = res["best_match"]["alert_id"]
                        res["best_match"]["timestamp"] = history_meta[b_id].get("timestamp")
                        res["best_match"]["day"] = history_meta[b_id].get("day")

                    cache[mem_key] = res
                    # Save atomically
                    temp_file = DEMO_CACHE_FILE.with_suffix(".tmp")
                    with open(temp_file, "w", encoding="utf-8") as f:
                        json.dump(cache, f, indent=2, default=str)
                    temp_file.replace(DEMO_CACHE_FILE)

                    print(f"  -> State: {res.get('state').upper()} ({elapsed:.2f}s)")
                except Exception as e:
                    logger.error(f"Failed to warm {mem_key}: {e}")

                time.sleep(PACING_SECONDS)

            # 2. Warm No-Memory Mode
            nomem_key = f"{aid}:nomemory"
            if nomem_key in cache and not cache[nomem_key].get("error"):
                print(f"[CACHE HIT] {nomem_key} is already warmed.")
            else:
                print(f"[WARMING] Computing {nomem_key}...")
                start_t = time.time()
                try:
                    res = agent.analyze_without_memory(alert)
                    elapsed = time.time() - start_t
                    res["elapsed_seconds"] = round(elapsed, 3)

                    cache[nomem_key] = res
                    # Save atomically
                    temp_file = DEMO_CACHE_FILE.with_suffix(".tmp")
                    with open(temp_file, "w", encoding="utf-8") as f:
                        json.dump(cache, f, indent=2, default=str)
                    temp_file.replace(DEMO_CACHE_FILE)

                    print(f"  -> State: {res.get('state').upper()} ({elapsed:.2f}s)")
                except Exception as e:
                    logger.error(f"Failed to warm {nomem_key}: {e}")

                time.sleep(PACING_SECONDS)

    finally:
        agent.close()

    print("\nCache warming complete. Saved to", DEMO_CACHE_FILE)


if __name__ == "__main__":
    main()
