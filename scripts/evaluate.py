#!/usr/bin/env python3
"""
SOC Memory Agent - Evaluation Runner and Benchmarking Suite.

CRITICAL CONSTRAINTS:
- This is the ONLY file allowed to read data/ground_truth.json.
- agent/soc_agent.py and agent modules never access ground_truth.json.
- ground_truth.json is read once at the start to select sample IDs,
  and once at the end to score.
- No ground truth data is ever passed to the agent or prompts.
"""

import json
import logging
import os
import random
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("evaluate")

# Add workspace root to sys.path so 'agent' package is importable
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from agent.soc_agent import SOCMemoryAgent

# File Paths
DATA_DIR = Path("data")
GROUND_TRUTH_FILE = DATA_DIR / "ground_truth.json"
ALERTS_FILE = DATA_DIR / "alerts.json"
RESULTS_DIR = Path("results")

SAMPLE_IDS_FILE = RESULTS_DIR / "sample_ids.json"
EVAL_MEMORY_FILE = RESULTS_DIR / "eval_memory.json"
EVAL_NOMEMORY_FILE = RESULTS_DIR / "eval_nomemory.json"
EVAL_SUMMARY_FILE = RESULTS_DIR / "eval_summary.json"

RANDOM_SEED = 42
BENIGN_SAMPLE_SIZE = 40
MAX_RETRIES = 5


def select_evaluation_sample() -> Tuple[List[Dict[str, Any]], List[str], Dict[str, int]]:
    """
    Reads ground_truth.json ONCE at start to deterministically select the sample:
    - ALL replay alerts where variant is 'lookalike' or 'attack'.
    - Exactly 40 replay alerts where variant is 'recurring_benign' using seed 42.
    Saves selected IDs to results/sample_ids.json.
    """
    if not GROUND_TRUTH_FILE.exists():
        logger.error(f"Ground truth dataset not found at {GROUND_TRUTH_FILE}")
        sys.exit(1)

    with open(GROUND_TRUTH_FILE, "r", encoding="utf-8") as f:
        gt_data = json.load(f)

    # Filter replay alerts only
    replay_gt = [g for g in gt_data if g.get("phase") == "replay"]

    lookalikes = [g for g in replay_gt if g.get("variant") == "lookalike"]
    attacks = [g for g in replay_gt if g.get("variant") == "attack"]
    recurring_benign = [g for g in replay_gt if g.get("variant") == "recurring_benign"]

    lookalike_count = len(lookalikes)
    attack_count = len(attacks)
    benign_total = len(recurring_benign)

    print("\n" + "=" * 70)
    print("GROUND TRUTH REPLAY POOL:")
    print(f"  - Attacks:          {attack_count}")
    print(f"  - Lookalikes:       {lookalike_count}")
    print(f"  - Recurring Benign: {benign_total} (Sampling {BENIGN_SAMPLE_SIZE})")
    print("=" * 70)

    if lookalike_count == 0:
        logger.error("Lookalike count is ZERO. Aborting evaluation.")
        sys.exit(1)

    if attack_count == 0:
        logger.error("Attack count is ZERO. Aborting evaluation.")
        sys.exit(1)

    # Deterministic sampling of 40 recurring benign alerts
    rnd = random.Random(RANDOM_SEED)
    selected_benign = rnd.sample(recurring_benign, min(BENIGN_SAMPLE_SIZE, benign_total))

    selected_sample = attacks + lookalikes + selected_benign
    selected_sample_ids = [g["alert_id"] for g in selected_sample]

    variant_counts = {
        "attack": attack_count,
        "lookalike": lookalike_count,
        "recurring_benign": len(selected_benign),
        "total": len(selected_sample_ids),
    }

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(SAMPLE_IDS_FILE, "w", encoding="utf-8") as f:
        json.dump(
            {
                "seed": RANDOM_SEED,
                "counts": variant_counts,
                "sample_ids": selected_sample_ids,
            },
            f,
            indent=2,
        )

    print(f"Saved {len(selected_sample_ids)} sample alert IDs to {SAMPLE_IDS_FILE}.\n")
    return selected_sample, selected_sample_ids, variant_counts


def load_existing_results(file_path: Path) -> Dict[str, Any]:
    """
    Loads existing evaluation results from file for resume safety.
    """
    if not file_path.exists():
        return {}

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                return data
    except Exception as e:
        logger.warning(f"Could not load existing {file_path}: {e}. Starting fresh.")
    return {}


def save_results_atomically(file_path: Path, data: Dict[str, Any]) -> None:
    """
    Atomically writes results to disk.
    """
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    temp_file = file_path.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    temp_file.replace(file_path)


def run_evaluation_mode(
    agent: SOCMemoryAgent,
    sample_ids: List[str],
    mode_name: str,
    output_file: Path,
    with_memory: bool,
) -> Dict[str, Any]:
    """
    Runs the agent in memory or no-memory mode across all sample alerts.
    Includes resume safety, timing, error backoff, and atomic saves.
    """
    results = load_existing_results(output_file)
    total_samples = len(sample_ids)

    print("=" * 70)
    print(f"STARTING EVALUATION RUN: {mode_name.upper()} (Memory={with_memory})")
    print(f"Total Targets: {total_samples} | Already Evaluated: {len(results)}")
    print("=" * 70)

    for idx, alert_id in enumerate(sample_ids, 1):
        if alert_id in results and "error" not in results[alert_id]:
            continue

        success = False
        backoff = 1.0

        for attempt in range(1, MAX_RETRIES + 1):
            start_time = time.time()
            try:
                if with_memory:
                    agent_output = agent.analyze_alert(alert_id)
                else:
                    agent_output = agent.analyze_without_memory(alert_id)

                elapsed = time.time() - start_time
                agent_output["elapsed_seconds"] = round(elapsed, 3)

                results[alert_id] = agent_output
                save_results_atomically(output_file, results)

                state = agent_output.get("state", "UNKNOWN").upper()
                print(f"[{idx}/{total_samples}] [{mode_name}] {alert_id} -> {state} ({elapsed:.2f}s)")
                success = True
                break

            except Exception as e:
                err_msg = str(e)
                if attempt == MAX_RETRIES:
                    elapsed = time.time() - start_time
                    logger.error(f"[{mode_name}] Permanent failure for {alert_id}: {err_msg}")
                    results[alert_id] = {
                        "alert_id": alert_id,
                        "error": True,
                        "error_message": err_msg,
                        "elapsed_seconds": round(elapsed, 3),
                    }
                    save_results_atomically(output_file, results)
                else:
                    sleep_dur = min(backoff * (2 ** (attempt - 1)) + random.uniform(0.1, 0.5), 16.0)
                    logger.warning(
                        f"[{mode_name}] [Attempt {attempt}/{MAX_RETRIES}] Error on {alert_id} ({err_msg}). Retrying in {sleep_dur:.2f}s..."
                    )
                    time.sleep(sleep_dur)

        # Light pacing between requests to stay smoothly within Groq TPM limits
        time.sleep(3.5)

    print(f"Completed {mode_name.upper()} run. Saved to {output_file}.\n")
    return results


def compute_evaluation_metrics(
    gt_map: Dict[str, Dict[str, Any]],
    eval_results: Dict[str, Any],
    sample_ids: List[str],
) -> Dict[str, Any]:
    """
    Computes all benchmark metrics by comparing agent outputs against ground truth:
    1. False greens (should_escalate == true AND state == green)
    2. Attacks caught (variant == attack AND state in [yellow, red])
    3. Unnecessary escalations (variant == recurring_benign AND state in [yellow, red])
    4. Human-review load ((yellow + red) / total valid alerts)
    5. Scenario breakdown
    6. Average timing
    """
    total_evaluated = 0
    failures = []
    false_greens = []
    attacks_total = 0
    attacks_caught = 0
    unnecessary_escalations = 0
    recurring_benign_total = 0
    human_review_count = 0
    total_time = 0.0

    scenario_stats: Dict[str, Dict[str, Any]] = {}

    for aid in sample_ids:
        gt = gt_map.get(aid)
        if not gt:
            continue

        scenario = gt.get("scenario", "unknown")
        variant = gt.get("variant", "unknown")
        should_escalate = gt.get("should_escalate", False)

        if scenario not in scenario_stats:
            scenario_stats[scenario] = {
                "total": 0,
                "green": 0,
                "yellow": 0,
                "red": 0,
                "false_greens": 0,
                "attacks_total": 0,
                "attacks_caught": 0,
                "unnecessary_escalations": 0,
                "recurring_benign_total": 0,
            }

        sc = scenario_stats[scenario]
        sc["total"] += 1

        res = eval_results.get(aid)
        if not res or res.get("error"):
            failures.append({"alert_id": aid, "error": res.get("error_message") if res else "Not evaluated"})
            continue

        total_evaluated += 1
        elapsed = res.get("elapsed_seconds", 0.0)
        total_time += elapsed

        state = str(res.get("state", "")).strip().lower()

        if state == "green":
            sc["green"] += 1
        elif state == "yellow":
            sc["yellow"] += 1
            human_review_count += 1
        elif state == "red":
            sc["red"] += 1
            human_review_count += 1

        # 1. False Green Check
        if should_escalate and state == "green":
            fg_info = {
                "alert_id": aid,
                "scenario": scenario,
                "variant": variant,
                "title": gt.get("title", ""),
                "explanation": res.get("explanation", ""),
            }
            false_greens.append(fg_info)
            sc["false_greens"] += 1

        # 2. Attacks Check
        if variant == "attack":
            attacks_total += 1
            sc["attacks_total"] += 1
            if state in ["yellow", "red"]:
                attacks_caught += 1
                sc["attacks_caught"] += 1

        # 3. Recurring Benign / Unnecessary Escalation Check
        if variant == "recurring_benign":
            recurring_benign_total += 1
            sc["recurring_benign_total"] += 1
            if state in ["yellow", "red"]:
                unnecessary_escalations += 1
                sc["unnecessary_escalations"] += 1

    human_review_load = (human_review_count / total_evaluated) if total_evaluated > 0 else 0.0
    avg_time = (total_time / total_evaluated) if total_evaluated > 0 else 0.0

    return {
        "sample_size": len(sample_ids),
        "total_evaluated": total_evaluated,
        "failures_count": len(failures),
        "failures": failures,
        "false_greens_count": len(false_greens),
        "false_greens": false_greens,
        "attacks_total": attacks_total,
        "attacks_caught": attacks_caught,
        "attacks_caught_pct": round((attacks_caught / attacks_total * 100), 1) if attacks_total > 0 else 0.0,
        "recurring_benign_total": recurring_benign_total,
        "unnecessary_escalations": unnecessary_escalations,
        "unnecessary_escalations_pct": round((unnecessary_escalations / recurring_benign_total * 100), 1) if recurring_benign_total > 0 else 0.0,
        "human_review_count": human_review_count,
        "human_review_load_pct": round(human_review_load * 100, 1),
        "average_time_seconds": round(avg_time, 3),
        "scenario_breakdown": scenario_stats,
    }


def print_comparison_table(metrics_mem: Dict[str, Any], metrics_nomem: Dict[str, Any]) -> None:
    """
    Prints a formatted comparison table and scenario breakdown.
    """
    print("\n" + "=" * 65)
    print("SOC MEMORY AGENT BENCHMARK EVALUATION RESULTS")
    print("=" * 65)
    header = f"{'Metric':<32} {'Memory':<16} {'No Memory':<16}"
    print(header)
    print("-" * 65)

    print(f"{'Sample size':<32} {metrics_mem['sample_size']:<16} {metrics_nomem['sample_size']:<16}")
    print(
        f"{'False greens':<32} {metrics_mem['false_greens_count']:<16} {metrics_nomem['false_greens_count']:<16}"
    )
    attacks_mem_str = f"{metrics_mem['attacks_caught']}/{metrics_mem['attacks_total']} ({metrics_mem['attacks_caught_pct']}%)"
    attacks_nomem_str = f"{metrics_nomem['attacks_caught']}/{metrics_nomem['attacks_total']} ({metrics_nomem['attacks_caught_pct']}%)"
    print(f"{'Attacks caught':<32} {attacks_mem_str:<16} {attacks_nomem_str:<16}")

    unnec_mem_str = f"{metrics_mem['unnecessary_escalations']}/{metrics_mem['recurring_benign_total']} ({metrics_mem['unnecessary_escalations_pct']}%)"
    unnec_nomem_str = f"{metrics_nomem['unnecessary_escalations']}/{metrics_nomem['recurring_benign_total']} ({metrics_nomem['unnecessary_escalations_pct']}%)"
    print(f"{'Unnecessary escalations':<32} {unnec_mem_str:<16} {unnec_nomem_str:<16}")

    hr_mem_str = f"{metrics_mem['human_review_load_pct']}%"
    hr_nomem_str = f"{metrics_nomem['human_review_load_pct']}%"
    print(f"{'Human-review load':<32} {hr_mem_str:<16} {hr_nomem_str:<16}")

    time_mem_str = f"{metrics_mem['average_time_seconds']:.2f}s"
    time_nomem_str = f"{metrics_nomem['average_time_seconds']:.2f}s"
    print(f"{'Average time / alert':<32} {time_mem_str:<16} {time_nomem_str:<16}")
    print("-" * 65)

    # Print False Greens Detail
    print("\n--- FALSE GREENS DETAIL ---")
    if metrics_mem["false_greens"]:
        print("Memory Mode False Greens:")
        for fg in metrics_mem["false_greens"]:
            print(f"  - [{fg['alert_id']}] Scenario: {fg['scenario']}, Variant: {fg['variant']}")
    else:
        print("Memory Mode False Greens: NONE (0 false greens!)")

    if metrics_nomem["false_greens"]:
        print("\nNo-Memory Mode False Greens:")
        for fg in metrics_nomem["false_greens"]:
            print(f"  - [{fg['alert_id']}] Scenario: {fg['scenario']}, Variant: {fg['variant']}")
    else:
        print("\nNo-Memory Mode False Greens: NONE")

    # Print Scenario Breakdown
    print("\n--- SCENARIO BREAKDOWN (Memory vs No-Memory) ---")
    scenarios = sorted(list(metrics_mem["scenario_breakdown"].keys()))
    print(f"{'Scenario':<24} {'Total':<8} {'Mem FG':<8} {'Mem Attk':<10} {'NoMem FG':<10} {'NoMem Attk':<10}")
    print("-" * 72)
    for sc in scenarios:
        m_sc = metrics_mem["scenario_breakdown"].get(sc, {})
        n_sc = metrics_nomem["scenario_breakdown"].get(sc, {})
        tot = m_sc.get("total", 0)
        m_fg = m_sc.get("false_greens", 0)
        m_attk = f"{m_sc.get('attacks_caught', 0)}/{m_sc.get('attacks_total', 0)}"
        n_fg = n_sc.get("false_greens", 0)
        n_attk = f"{n_sc.get('attacks_caught', 0)}/{n_sc.get('attacks_total', 0)}"
        print(f"{sc:<24} {tot:<8} {m_fg:<8} {m_attk:<10} {n_fg:<10} {n_attk:<10}")
    print("=" * 72 + "\n")


def main():
    # Step 1: Select Sample using Ground Truth once at start
    selected_sample, sample_ids, variant_counts = select_evaluation_sample()

    # Step 2: Initialize Agent
    agent = SOCMemoryAgent()

    try:
        # Step 3: Run Memory Mode
        results_memory = run_evaluation_mode(
            agent=agent,
            sample_ids=sample_ids,
            mode_name="Memory",
            output_file=EVAL_MEMORY_FILE,
            with_memory=True,
        )

        # Step 4: Run No-Memory Mode
        results_nomemory = run_evaluation_mode(
            agent=agent,
            sample_ids=sample_ids,
            mode_name="No-Memory",
            output_file=EVAL_NOMEMORY_FILE,
            with_memory=False,
        )
    finally:
        agent.close()

    # Step 5: Read Ground Truth at end to compute metrics
    with open(GROUND_TRUTH_FILE, "r", encoding="utf-8") as f:
        gt_data = json.load(f)
    gt_map = {g["alert_id"]: g for g in gt_data if g.get("phase") == "replay"}

    metrics_memory = compute_evaluation_metrics(gt_map, results_memory, sample_ids)
    metrics_nomemory = compute_evaluation_metrics(gt_map, results_nomemory, sample_ids)

    # Step 6: Print Report Table
    print_comparison_table(metrics_memory, metrics_nomemory)

    # Step 7: Save Full Structured Summary to results/eval_summary.json
    summary_report = {
        "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sample_definition": {
            "random_seed": RANDOM_SEED,
            "benign_sample_size": BENIGN_SAMPLE_SIZE,
            "variant_counts": variant_counts,
            "selected_alert_ids": sample_ids,
        },
        "metrics": {
            "memory_mode": metrics_memory,
            "no_memory_mode": metrics_nomemory,
        },
    }

    save_results_atomically(EVAL_SUMMARY_FILE, summary_report)
    print(f"Full structured evaluation summary saved to {EVAL_SUMMARY_FILE}")


if __name__ == "__main__":
    main()
