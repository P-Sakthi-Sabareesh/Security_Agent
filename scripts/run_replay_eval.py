#!/usr/bin/env python3
"""
Runs the SOC Memory Agent across the first 40 replay alerts from data/alerts.json.
Calculates distribution of final states (GREEN, YELLOW, RED, FAILED).
"""

import json
import sys
import time
from pathlib import Path

# Add workspace root to sys.path
workspace_root = Path(__file__).resolve().parent.parent
if str(workspace_root) not in sys.path:
    sys.path.insert(0, str(workspace_root))

from agent.soc_agent import SOCMemoryAgent


def main():
    alerts_file = Path("data") / "alerts.json"
    with open(alerts_file, "r", encoding="utf-8") as f:
        all_alerts = json.load(f)

    # Filter first 40 replay alerts
    replay_alerts = [a for a in all_alerts if a.get("phase") == "replay"][:40]
    total_to_run = len(replay_alerts)
    print(f"Loaded {total_to_run} replay alerts for distribution evaluation.")

    agent = SOCMemoryAgent()

    counts = {
        "GREEN": 0,
        "YELLOW": 0,
        "RED": 0,
        "FAILED": 0,
    }

    results = []

    try:
        for idx, alert in enumerate(replay_alerts, 1):
            aid = alert.get("alert_id")
            title = alert.get("title")

            try:
                # Run actual agent with memory
                res = agent.analyze_alert(alert)
                state = str(res.get("state", "FAILED")).upper()
                if state not in ["GREEN", "YELLOW", "RED"]:
                    state = "FAILED"
                counts[state] += 1
                results.append((aid, state, res.get("models_tried", [])))
                print(f"[{idx}/{total_to_run}] Alert {aid}: {state} (Title: {title})")
            except Exception as e:
                counts["FAILED"] += 1
                results.append((aid, "FAILED", str(e)))
                print(f"[{idx}/{total_to_run}] Alert {aid}: FAILED ({e})")

            # Light pacing between calls to respect Groq rate limits
            time.sleep(0.3)
    finally:
        agent.close()

    print("\n" + "=" * 60)
    print("FIRST 40 REPLAY ALERTS STATE DISTRIBUTION")
    print("=" * 60)
    print(f"Replay alerts analyzed: {total_to_run}")
    print(f"GREEN:  {counts['GREEN']}")
    print(f"YELLOW: {counts['YELLOW']}")
    print(f"RED:    {counts['RED']}")
    print(f"FAILED: {counts['FAILED']}")
    print(f"Total:  {counts['GREEN'] + counts['YELLOW'] + counts['RED'] + counts['FAILED']}")
    print("=" * 60)


if __name__ == "__main__":
    main()
