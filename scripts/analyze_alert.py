#!/usr/bin/env python3
"""
CLI Tool to analyze a SOC security alert using the SOC Memory Agent.

Usage:
    python scripts/analyze_alert.py ALRT-00663
    python scripts/analyze_alert.py ALRT-00663 --no-memory
    python scripts/analyze_alert.py ALRT-00662
    python scripts/analyze_alert.py ALRT-00661
"""

import argparse
import json
import sys
from pathlib import Path

# Add workspace root to sys.path so 'agent' package is importable
workspace_root = Path(__file__).resolve().parent.parent
if str(workspace_root) not in sys.path:
    sys.path.insert(0, str(workspace_root))

from agent.soc_agent import SOCMemoryAgent, load_alert


def main():
    parser = argparse.ArgumentParser(
        description="Analyze a SOC security alert using Hindsight memory and Groq LLM reasoning."
    )
    parser.add_argument(
        "alert_id",
        type=str,
        help="The Alert ID to analyze (e.g. ALRT-00663).",
    )
    parser.add_argument(
        "--no-memory",
        action="store_true",
        help="Run analysis without recalling historical memory context.",
    )

    args = parser.parse_args()
    alert_id = args.alert_id.strip()

    try:
        # Load and validate alert phase
        alert_data = load_alert(alert_id)
        if alert_data.get("phase") != "replay":
            print(
                f"Warning: Alert {alert_id} has phase '{alert_data.get('phase')}'. Expected 'replay'.",
                file=sys.stderr,
            )

        agent = SOCMemoryAgent()
        try:
            if args.no_memory:
                result = agent.analyze_without_memory(alert_data)
            else:
                result = agent.analyze_alert(alert_data)
        finally:
            agent.close()

        # Output clean JSON result
        print(json.dumps(result, indent=2, default=str))

    except Exception as e:
        error_output = {
            "error": True,
            "alert_id": alert_id,
            "message": str(e),
        }
        print(json.dumps(error_output, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
