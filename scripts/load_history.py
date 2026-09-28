#!/usr/bin/env python3
"""
SOC Memory Agent - Historical Security Experience Loader
Ingests historical alert experiences into Hindsight Cloud.

Usage:
    # 1. Run the safe single-memory test first:
    python scripts/load_history.py --test-only

    # 2. Bulk load all remaining historical alerts:
    python scripts/load_history.py --bulk

    # 3. Test recall independently:
    python scripts/load_history.py --recall "2 AM large backup transfer from db-prod-01"
"""

import argparse
import datetime
import json
import logging
import os
import random
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import dotenv
from hindsight_client import Hindsight

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("load_history")

# Constants
DATA_DIR = Path("data")
ALERTS_FILE = DATA_DIR / "alerts.json"
LOADED_IDS_FILE = DATA_DIR / "loaded_ids.json"
DEFAULT_BASE_URL = "https://api.hindsight.vectorize.io"
DEFAULT_MAX_RETRIES = 5
DEFAULT_INITIAL_BACKOFF = 1.0
DEFAULT_MAX_BACKOFF = 32.0


def load_environment() -> Tuple[str, str, str]:
    """
    Loads and validates environment variables from .env.
    Never logs or exposes secret keys.
    """
    dotenv.load_dotenv(override=True)

    api_key = os.environ.get("HINDSIGHT_API_KEY", "").strip()
    bank_id = os.environ.get("HINDSIGHT_BANK_ID", "").strip()
    base_url = os.environ.get("HINDSIGHT_API_URL", DEFAULT_BASE_URL).strip()

    if not api_key:
        logger.error("HINDSIGHT_API_KEY is not set in .env file.")
        sys.exit(1)

    if not bank_id:
        logger.error("HINDSIGHT_BANK_ID is not set in .env file.")
        sys.exit(1)

    return api_key, bank_id, base_url


def load_dataset() -> Tuple[List[Dict[str, Any]], int]:
    """
    Loads data/alerts.json and extracts historical alerts (phase == 'history').
    Calculates dynamic count without hardcoding.
    """
    if not ALERTS_FILE.exists():
        logger.error(f"Alerts dataset not found at {ALERTS_FILE}")
        sys.exit(1)

    try:
        with open(ALERTS_FILE, "r", encoding="utf-8") as f:
            all_alerts = json.load(f)
    except Exception as e:
        logger.error(f"Failed to read {ALERTS_FILE}: {e}")
        sys.exit(1)

    if not isinstance(all_alerts, list):
        logger.error(f"Expected a list of alerts in {ALERTS_FILE}, got {type(all_alerts)}")
        sys.exit(1)

    history_alerts = [a for a in all_alerts if a.get("phase") == "history"]
    history_count = len(history_alerts)

    return history_alerts, history_count


def load_loaded_ids() -> Set[str]:
    """
    Loads set of already ingested alert IDs from data/loaded_ids.json for idempotency.
    """
    if not LOADED_IDS_FILE.exists():
        return set()

    try:
        with open(LOADED_IDS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return set(data)
            elif isinstance(data, dict) and "loaded_ids" in data:
                return set(data["loaded_ids"])
    except Exception as e:
        logger.warning(f"Could not load existing {LOADED_IDS_FILE}: {e}. Starting fresh.")
    return set()


def save_loaded_ids(loaded_ids: Set[str]) -> None:
    """
    Atomically saves the set of ingested alert IDs to data/loaded_ids.json.
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    temp_file = LOADED_IDS_FILE.with_suffix(".tmp")
    sorted_ids = sorted(list(loaded_ids))

    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(sorted_ids, f, indent=2)

    temp_file.replace(LOADED_IDS_FILE)


def format_security_experience(alert: Dict[str, Any]) -> str:
    """
    Formats a single historical alert into a structured, readable security-experience memory.
    """
    alert_id = alert.get("alert_id", "N/A")
    timestamp = alert.get("timestamp", "N/A")
    title = alert.get("title", "N/A")
    category = alert.get("category", "N/A")
    severity = alert.get("severity", "N/A")
    user = alert.get("user", "N/A")
    host = alert.get("host", "N/A")
    src_ip = alert.get("src_ip", "N/A")
    dst = alert.get("dst", "N/A")
    analyst = alert.get("analyst", "N/A")
    inv_note = alert.get("investigation_note", "N/A")
    verdict = alert.get("verdict", "N/A")
    outcome = alert.get("outcome", "N/A")

    # Format key details
    details = alert.get("details", {})
    if isinstance(details, dict):
        details_lines = [f"  - {k}: {v}" for k, v in details.items()]
        details_str = "\n" + "\n".join(details_lines) if details_lines else " None"
    else:
        details_str = f" {details}"

    # Format relevant context signals
    ctx = alert.get("context", {})
    if isinstance(ctx, dict):
        ctx_lines = [f"  - {k}: {v}" for k, v in ctx.items()]
        ctx_str = "\n" + "\n".join(ctx_lines) if ctx_lines else " None"
    else:
        ctx_str = f" {ctx}"

    lines = [
        f"Alert ID: {alert_id}",
        f"Timestamp: {timestamp}",
        f"Title: {title}",
        f"Category: {category}",
        f"Severity: {severity}",
        f"User: {user}",
        f"Host: {host}",
        f"Source IP: {src_ip}",
        f"Destination: {dst}",
        f"Key Details:{details_str}",
        f"Relevant Context Signals:{ctx_str}",
        f"Analyst: {analyst}",
        f"Investigation Note: {inv_note}",
        f"Verdict: {verdict}",
        f"Outcome: {outcome}",
    ]
    return "\n".join(lines)


def extract_metadata_and_tags(alert: Dict[str, Any]) -> Tuple[Dict[str, str], List[str]]:
    """
    Extracts metadata dictionary (string values) and tags list for Hindsight retain API.
    """
    alert_id = str(alert.get("alert_id", ""))
    metadata = {
        "alert_id": alert_id,
        "title": str(alert.get("title", "")),
        "analyst": str(alert.get("analyst", "")),
        "verdict": str(alert.get("verdict", "")),
        "day": str(alert.get("day", "")),
        "category": str(alert.get("category", "")),
        "severity": str(alert.get("severity", "")),
    }

    tags = [
        f"alert_id:{alert_id}",
        f"category:{str(alert.get('category', '')).lower()}",
        f"verdict:{str(alert.get('verdict', '')).lower()}",
        f"severity:{str(alert.get('severity', '')).lower()}",
        f"day:{alert.get('day', '')}",
    ]

    return metadata, tags


def retain_alert_with_retry(
    client: Hindsight,
    bank_id: str,
    alert: Dict[str, Any],
    max_retries: int = DEFAULT_MAX_RETRIES,
) -> Tuple[bool, Optional[Any], Optional[str]]:
    """
    Sends one security experience memory to Hindsight with exponential backoff.
    """
    content = format_security_experience(alert)
    metadata, tags = extract_metadata_and_tags(alert)
    alert_id = alert["alert_id"]

    # Parse timestamp if valid ISO format
    ts_str = alert.get("timestamp")
    parsed_ts = None
    if ts_str:
        try:
            parsed_ts = datetime.datetime.fromisoformat(ts_str)
        except Exception:
            parsed_ts = None

    context_str = f"Historical Security Experience - Alert {alert_id}"

    backoff = DEFAULT_INITIAL_BACKOFF
    for attempt in range(1, max_retries + 1):
        try:
            resp = client.retain(
                bank_id=bank_id,
                content=content,
                timestamp=parsed_ts,
                context=context_str,
                document_id=alert_id,
                metadata=metadata,
                tags=tags,
            )
            # Check response success
            if hasattr(resp, "success") and resp.success is False:
                err_msg = f"API returned success=False for alert {alert_id}"
                if attempt == max_retries:
                    return False, resp, err_msg
            else:
                return True, resp, None
        except Exception as e:
            err_msg = str(e)
            if attempt == max_retries:
                return False, None, err_msg
            sleep_time = min(backoff * (2 ** (attempt - 1)) + random.uniform(0.1, 0.5), DEFAULT_MAX_BACKOFF)
            logger.warning(
                f"[Attempt {attempt}/{max_retries}] Retrying {alert_id} after {sleep_time:.2f}s due to: {err_msg}"
            )
            time.sleep(sleep_time)

    return False, None, "Max retries exceeded"


def perform_recall_test(client: Hindsight, bank_id: str, query: str) -> None:
    """
    Executes a recall test query and prints the top 5 results.
    """
    print("\n" + "=" * 70)
    print(f"RUNNING RECALL TEST: \"{query}\"")
    print("=" * 70)

    try:
        resp = client.recall(
            bank_id=bank_id,
            query=query,
            budget="high",
            max_tokens=4096,
        )

        results = getattr(resp, "results", []) or []
        print(f"Recall returned {len(results)} memory units.")

        top_5 = results[:5]
        if not top_5:
            print("No matching memories recalled.")
        else:
            for idx, res in enumerate(top_5, 1):
                res_id = getattr(res, "id", "N/A")
                res_type = getattr(res, "type", "N/A")
                res_text = getattr(res, "text", "")
                res_scores = getattr(res, "scores", {})
                res_meta = getattr(res, "metadata", {})
                res_tags = getattr(res, "tags", [])

                print(f"\n--- Result #{idx} [ID: {res_id}] [Type: {res_type}] ---")
                if res_scores:
                    print(f"Scores: {res_scores}")
                if res_meta:
                    print(f"Metadata: {res_meta}")
                if res_tags:
                    print(f"Tags: {res_tags}")
                print("Content:")
                print(res_text.strip())

    except Exception as e:
        logger.error(f"Recall test failed with error: {e}")


def run_one_memory_test(
    client: Hindsight, bank_id: str, history_alerts: List[Dict[str, Any]], loaded_ids: Set[str]
) -> bool:
    """
    Retains ONLY the first historical alert as a safety test, verifies success,
    runs recall test, and stops.
    """
    print("\n" + "=" * 70)
    print("INGESTION SAFETY: EXECUTING ONE-MEMORY TEST")
    print("=" * 70)

    if not history_alerts:
        logger.error("No historical alerts found to test.")
        return False

    first_alert = history_alerts[0]
    first_id = first_alert["alert_id"]
    print(f"Testing retention of first historical alert: {first_id} ({first_alert.get('title')})")

    success, resp, error_msg = retain_alert_with_retry(client, bank_id, first_alert, max_retries=3)

    if not success:
        logger.error(f"One-memory test FAILED for {first_id}: {error_msg}")
        return False

    print(f"Retain call for {first_id} SUCCEEDED!")
    if hasattr(resp, "usage") and resp.usage:
        print(f"Token usage for test retain: {resp.usage}")

    # Mark first alert as loaded
    loaded_ids.add(first_id)
    save_loaded_ids(loaded_ids)
    print(f"Updated {LOADED_IDS_FILE} with test alert {first_id}.")

    # Run Recall Test as required
    recall_query = "2 AM large backup transfer from db-prod-01"
    perform_recall_test(client, bank_id, recall_query)

    print("\n" + "=" * 70)
    print("ONE-MEMORY TEST COMPLETED SUCCESSFULLY.")
    print("To proceed with bulk loading the remaining historical alerts, run:")
    print("    python scripts/load_history.py --bulk")
    print("=" * 70)

    return True


def run_bulk_loading(
    client: Hindsight, bank_id: str, history_alerts: List[Dict[str, Any]], loaded_ids: Set[str]
) -> None:
    """
    Bulk loads all remaining historical alerts with rate limiting, retries,
    and checkpointing to data/loaded_ids.json.
    """
    total_history = len(history_alerts)
    initial_loaded_count = len(loaded_ids)

    # Filter alerts that need to be loaded
    pending_alerts = [a for a in history_alerts if a.get("alert_id") not in loaded_ids]
    skipped_count = total_history - len(pending_alerts)

    print("\n" + "=" * 70)
    print("STARTING BULK INGESTION")
    print(f"Total History Alerts: {total_history}")
    print(f"Already Loaded:       {skipped_count}")
    print(f"Pending To Load:      {len(pending_alerts)}")
    print("=" * 70)

    if not pending_alerts:
        print("All historical alerts are already loaded into Hindsight.")
        return

    newly_loaded = 0
    failed_alerts = []
    total_input_tokens = 0
    total_output_tokens = 0
    start_time = time.time()

    for idx, alert in enumerate(pending_alerts, 1):
        alert_id = alert["alert_id"]
        success, resp, err_msg = retain_alert_with_retry(client, bank_id, alert)

        if success:
            newly_loaded += 1
            loaded_ids.add(alert_id)
            save_loaded_ids(loaded_ids)

            if hasattr(resp, "usage") and resp.usage:
                total_input_tokens += getattr(resp.usage, "input_tokens", 0) or 0
                total_output_tokens += getattr(resp.usage, "output_tokens", 0) or 0
        else:
            failed_alerts.append((alert_id, err_msg))
            logger.error(f"Failed to ingest alert {alert_id}: {err_msg}")

        current_total_processed = skipped_count + newly_loaded
        # Print progress milestones (e.g., every 25 alerts or at the end)
        if current_total_processed % 25 == 0 or current_total_processed == total_history:
            print(f"Progress: {current_total_processed}/{total_history} historical alerts processed.")

        # Light delay to respect API concurrency/rate limits
        time.sleep(0.1)

    elapsed_time = time.time() - start_time

    # Final summary report
    print("\n" + "=" * 70)
    print("BULK INGESTION SUMMARY REPORT")
    print("=" * 70)
    print(f"Total History Alerts: {total_history}")
    print(f"Already Loaded (pre): {initial_loaded_count}")
    print(f"Newly Loaded:         {newly_loaded}")
    print(f"Failed:               {len(failed_alerts)}")
    print(f"Skipped (pre-loaded): {skipped_count}")
    print(f"Elapsed Time:         {elapsed_time:.2f}s ({elapsed_time/60:.2f} min)")
    if total_input_tokens or total_output_tokens:
        print(f"Tokens Used - Input:  {total_input_tokens:,}, Output: {total_output_tokens:,}")

    if failed_alerts:
        print("\nFailed Alerts Summary:")
        for fid, reason in failed_alerts:
            print(f"  - {fid}: {reason}")
    else:
        print("\nAll historical alerts ingested successfully with 100% success rate!")


def main():
    parser = argparse.ArgumentParser(
        description="Load SOC historical security experiences into Hindsight Cloud."
    )
    parser.add_argument(
        "--test-only",
        "-t",
        action="store_true",
        help="Run safety test (ingest 1 memory, run recall query, and stop).",
    )
    parser.add_argument(
        "--bulk",
        "-b",
        action="store_true",
        help="Bulk ingest all remaining historical alerts into Hindsight Cloud.",
    )
    parser.add_argument(
        "--recall",
        "-r",
        type=str,
        help="Run a custom recall query against the memory bank.",
    )

    args = parser.parse_args()

    # Step 1: Environment & Credential Check
    api_key, bank_id, base_url = load_environment()

    # Step 2: Initialize Hindsight Client
    client = Hindsight(base_url=base_url, api_key=api_key)

    try:
        # Custom recall query mode
        if args.recall:
            perform_recall_test(client, bank_id, args.recall)
            return

        # Step 3: Load and Validate Dataset
        history_alerts, history_count = load_dataset()
        print(f"Loaded dataset: verified {history_count} historical alerts (phase == 'history').")

        # Step 4: Check Idempotency Store
        loaded_ids = load_loaded_ids()
        print(f"Loaded IDs store: {len(loaded_ids)} alerts already marked as ingested in {LOADED_IDS_FILE}.")

        # Step 5: Execution Mode Routing
        if args.test_only:
            run_one_memory_test(client, bank_id, history_alerts, loaded_ids)
        elif args.bulk:
            # If no alerts loaded yet, execute the one-memory test first to ensure safety
            if not loaded_ids:
                test_success = run_one_memory_test(client, bank_id, history_alerts, loaded_ids)
                if not test_success:
                    logger.error("Aborting bulk loading because one-memory safety test failed.")
                    sys.exit(1)
            run_bulk_loading(client, bank_id, history_alerts, loaded_ids)
        else:
            # Default behavior without flags: Run the one-memory safety test and STOP
            if not loaded_ids:
                run_one_memory_test(client, bank_id, history_alerts, loaded_ids)
            else:
                print("\n" + "=" * 70)
                print(f"Notice: {len(loaded_ids)}/{history_count} alerts are currently loaded.")
                print("Run with '--test-only' to re-run the safety test, or '--bulk' to ingest all alerts.")
                print("=" * 70)
    finally:
        try:
            client.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()
