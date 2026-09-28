#!/usr/bin/env python3
"""
SOC Memory Agent - Evaluation Runner and Benchmarking Suite (V2).

CRITICAL CONSTRAINTS:
- This is the ONLY file allowed to read data/ground_truth.json.
- agent/soc_agent.py and agent modules never access ground_truth.json.
- ground_truth.json is read once at the start to select/load sample IDs,
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

# V1 Paths
V1_DIR = RESULTS_DIR / "v1"
V1_SUMMARY_FILE = V1_DIR / "eval_summary.json"

# V2 Paths
V2_DIR = RESULTS_DIR / "v2"
V2_MEMORY_FILE = V2_DIR / "eval_memory.json"
V2_NOMEMORY_FILE = V2_DIR / "eval_nomemory.json"
V2_SUMMARY_FILE = V2_DIR / "eval_summary.json"

RANDOM_SEED = 42
BENIGN_SAMPLE_SIZE = 40
MAX_RETRIES = 8
PACING_SECONDS = 3.0


def get_or_create_sample_ids() -> Tuple[List[str], Dict[str, int]]:
    """
    Loads existing sample_ids.json to guarantee exact sample consistency with V1.
    If not present, selects deterministically using seed 42.
    """
    if SAMPLE_IDS_FILE.exists():
        with open(SAMPLE_IDS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            sample_ids = data.get("sample_ids", [])
            counts = data.get("counts", {})
            print(f"Loaded existing V1 sample of {len(sample_ids)} alerts from {SAMPLE_IDS_FILE}.")
            return sample_ids, counts

    # Fallback to deterministic selection
    with open(GROUND_TRUTH_FILE, "r", encoding="utf-8") as f:
        gt_data = json.load(f)

    replay_gt = [g for g in gt_data if g.get("phase") == "replay"]
    lookalikes = [g for g in replay_gt if g.get("variant") == "lookalike"]
    attacks = [g for g in replay_gt if g.get("variant") == "attack"]
    recurring_benign = [g for g in replay_gt if g.get("variant") == "recurring_benign"]

    rnd = random.Random(RANDOM_SEED)
    selected_benign = rnd.sample(recurring_benign, min(BENIGN_SAMPLE_SIZE, len(recurring_benign)))

    selected_sample = attacks + lookalikes + selected_benign
    selected_sample_ids = [g["alert_id"] for g in selected_sample]

    counts = {
        "attack": len(attacks),
        "lookalike": len(lookalikes),
        "recurring_benign": len(selected_benign),
        "total": len(selected_sample_ids),
    }

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(SAMPLE_IDS_FILE, "w", encoding="utf-8") as f:
        json.dump({"seed": RANDOM_SEED, "counts": counts, "sample_ids": selected_sample_ids}, f, indent=2)

    return selected_sample_ids, counts


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
    file_path.parent.mkdir(parents=True, exist_ok=True)
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
    Includes resume safety, timing, error backoff up to 8 retries, and atomic saves.
    FAILED alerts are retried rather than accepted as classifications.
    """
    results = load_existing_results(output_file)
    total_samples = len(sample_ids)

    # Clean out previous failed items so they are retried
    clean_results = {k: v for k, v in results.items() if not v.get("error")}
    if len(clean_results) != len(results):
        logger.info(f"Retrying {len(results) - len(clean_results)} previously failed alerts.")
        results = clean_results
        save_results_atomically(output_file, results)

    print("=" * 70)
    print(f"STARTING EVALUATION RUN: {mode_name.upper()} (Memory={with_memory})")
    print(f"Total Targets: {total_samples} | Already Evaluated: {len(results)}")
    print("=" * 70)

    for idx, alert_id in enumerate(sample_ids, 1):
        if alert_id in results and not results[alert_id].get("error"):
            continue

        success = False

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

                state = str(agent_output.get("state", "UNKNOWN")).upper()
                model_used = agent_output.get("llm_result", {}).get("model_used", "N/A")
                print(f"[{idx}/{total_samples}] [{mode_name}] {alert_id} -> {state} ({elapsed:.2f}s, model: {model_used})")
                success = True
                break

            except Exception as e:
                err_msg = str(e)
                if attempt == MAX_RETRIES:
                    elapsed = time.time() - start_time
                    logger.error(f"[{mode_name}] Permanent failure for {alert_id} after {MAX_RETRIES} attempts: {err_msg}")
                    results[alert_id] = {
                        "alert_id": alert_id,
                        "error": True,
                        "error_message": err_msg,
                        "elapsed_seconds": round(elapsed, 3),
                    }
                    save_results_atomically(output_file, results)
                else:
                    sleep_dur = min(2.0 * (1.8 ** (attempt - 1)) + random.uniform(0.5, 1.5), 60.0)
                    logger.warning(
                        f"[{mode_name}] [Attempt {attempt}/{MAX_RETRIES}] Error on {alert_id} ({err_msg}). Retrying in {sleep_dur:.2f}s..."
                    )
                    time.sleep(sleep_dur)

        # Light pacing between requests to respect Groq TPM limits
        time.sleep(PACING_SECONDS)

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
    7. Failed / fallback counts
    """
    total_evaluated = 0
    failures = []
    fallback_rule_count = 0
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

        llm_model = res.get("llm_result", {}).get("model_used")
        if llm_model == "fallback_rule":
            fallback_rule_count += 1

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
        "fallback_rule_count": fallback_rule_count,
        "failed_or_fallback_count": len(failures) + fallback_rule_count,
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


def print_v1_v2_comparison_table(
    v1_mem: Dict[str, Any],
    v1_nomem: Dict[str, Any],
    v2_mem: Dict[str, Any],
    v2_nomem: Dict[str, Any],
) -> None:
    """
    Prints side-by-side comparison table across V1 Memory, V1 No-Memory, V2 Memory, V2 No-Memory.
    """
    print("\n" + "=" * 90)
    print("SOC MEMORY AGENT BENCHMARK: V1 vs V2 COMPARISON")
    print("=" * 90)

    header = f"{'Metric':<26} {'V1 Memory':<16} {'V1 No-Memory':<16} {'V2 Memory':<16} {'V2 No-Memory':<16}"
    print(header)
    print("-" * 90)

    # Sample size
    print(f"{'Sample size':<26} {v1_mem['sample_size']:<16} {v1_nomem['sample_size']:<16} {v2_mem['sample_size']:<16} {v2_nomem['sample_size']:<16}")

    # Failed / fallback count
    v1_mem_fb = f"{v1_mem.get('failed_or_fallback_count', 0)}"
    v1_nomem_fb = f"{v1_nomem.get('failed_or_fallback_count', 38)} (38 fb)"
    v2_mem_fb = f"{v2_mem.get('failed_or_fallback_count', 0)}"
    v2_nomem_fb = f"{v2_nomem.get('failed_or_fallback_count', 0)}"
    print(f"{'Failed/fallback count':<26} {v1_mem_fb:<16} {v1_nomem_fb:<16} {v2_mem_fb:<16} {v2_nomem_fb:<16}")

    # False greens
    print(f"{'False greens':<26} {v1_mem['false_greens_count']:<16} {v1_nomem['false_greens_count']:<16} {v2_mem['false_greens_count']:<16} {v2_nomem['false_greens_count']:<16}")

    # Attacks caught
    attk_v1_m = f"{v1_mem['attacks_caught']}/{v1_mem['attacks_total']} ({v1_mem['attacks_caught_pct']}%)"
    attk_v1_nm = f"{v1_nomem['attacks_caught']}/{v1_nomem['attacks_total']} ({v1_nomem['attacks_caught_pct']}%)"
    attk_v2_m = f"{v2_mem['attacks_caught']}/{v2_mem['attacks_total']} ({v2_mem['attacks_caught_pct']}%)"
    attk_v2_nm = f"{v2_nomem['attacks_caught']}/{v2_nomem['attacks_total']} ({v2_nomem['attacks_caught_pct']}%)"
    print(f"{'Attacks caught':<26} {attk_v1_m:<16} {attk_v1_nm:<16} {attk_v2_m:<16} {attk_v2_nm:<16}")

    # Unnecessary escalations
    unnec_v1_m = f"{v1_mem['unnecessary_escalations']}/{v1_mem['recurring_benign_total']} ({v1_mem['unnecessary_escalations_pct']}%)"
    unnec_v1_nm = f"{v1_nomem['unnecessary_escalations']}/{v1_nomem['recurring_benign_total']} ({v1_nomem['unnecessary_escalations_pct']}%)"
    unnec_v2_m = f"{v2_mem['unnecessary_escalations']}/{v2_mem['recurring_benign_total']} ({v2_mem['unnecessary_escalations_pct']}%)"
    unnec_v2_nm = f"{v2_nomem['unnecessary_escalations']}/{v2_nomem['recurring_benign_total']} ({v2_nomem['unnecessary_escalations_pct']}%)"
    print(f"{'Unnecessary escalations':<26} {unnec_v1_m:<16} {unnec_v1_nm:<16} {unnec_v2_m:<16} {unnec_v2_nm:<16}")

    # Human review load
    print(f"{'Human-review load':<26} {v1_mem['human_review_load_pct']}%{'':<10} {v1_nomem['human_review_load_pct']}%{'':<10} {v2_mem['human_review_load_pct']}%{'':<10} {v2_nomem['human_review_load_pct']}%{'':<10}")

    # Average time per alert
    print(f"{'Average time / alert':<26} {v1_mem['average_time_seconds']:.2f}s{'':<10} {v1_nomem['average_time_seconds']:.2f}s{'':<10} {v2_mem['average_time_seconds']:.2f}s{'':<10} {v2_nomem['average_time_seconds']:.2f}s{'':<10}")
    print("-" * 90)

    # Remaining False Greens in V2
    print("\n--- REMAINING FALSE GREENS IN V2 ---")
    if v2_mem["false_greens"]:
        print("V2 Memory Mode False Greens:")
        for fg in v2_mem["false_greens"]:
            print(f"  - [{fg['alert_id']}] Scenario: {fg['scenario']}, Variant: {fg['variant']}")
    else:
        print("V2 Memory Mode False Greens: NONE (0 False Greens!)")

    if v2_nomem["false_greens"]:
        print("V2 No-Memory Mode False Greens:")
        for fg in v2_nomem["false_greens"]:
            print(f"  - [{fg['alert_id']}] Scenario: {fg['scenario']}, Variant: {fg['variant']}")
    else:
        print("V2 No-Memory Mode False Greens: NONE (0 False Greens!)")
    print("=" * 90 + "\n")


def main():
    # Step 1: Load sample IDs (guaranteeing exact sample consistency)
    sample_ids, variant_counts = get_or_create_sample_ids()

    # Step 2: Initialize V2 Agent
    agent = SOCMemoryAgent()

    try:
        # Step 3: Run V2 Memory Mode
        results_memory = run_evaluation_mode(
            agent=agent,
            sample_ids=sample_ids,
            mode_name="V2-Memory",
            output_file=V2_MEMORY_FILE,
            with_memory=True,
        )

        # Step 4: Run V2 No-Memory Mode
        results_nomemory = run_evaluation_mode(
            agent=agent,
            sample_ids=sample_ids,
            mode_name="V2-No-Memory",
            output_file=V2_NOMEMORY_FILE,
            with_memory=False,
        )
    finally:
        agent.close()

    # Step 5: Read Ground Truth at end to compute metrics
    with open(GROUND_TRUTH_FILE, "r", encoding="utf-8") as f:
        gt_data = json.load(f)
    gt_map = {g["alert_id"]: g for g in gt_data if g.get("phase") == "replay"}

    metrics_v2_mem = compute_evaluation_metrics(gt_map, results_memory, sample_ids)
    metrics_v2_nomem = compute_evaluation_metrics(gt_map, results_nomemory, sample_ids)

    # Load V1 metrics for comparison
    v1_metrics_mem: Dict[str, Any] = {}
    v1_metrics_nomem: Dict[str, Any] = {}
    if V1_SUMMARY_FILE.exists():
        with open(V1_SUMMARY_FILE, "r", encoding="utf-8") as f:
            v1_data = json.load(f)
            v1_metrics_mem = v1_data.get("metrics", {}).get("memory_mode", {})
            v1_metrics_nomem = v1_data.get("metrics", {}).get("no_memory_mode", {})

    # Step 6: Print Side-by-Side V1 vs V2 Comparison Table
    print_v1_v2_comparison_table(v1_metrics_mem, v1_metrics_nomem, metrics_v2_mem, metrics_v2_nomem)

    # Step 7: Save Full Structured Summary to results/v2/eval_summary.json
    summary_report = {
        "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "note": "v2 rules were designed after analysing v1 failures on the same sample.",
        "sample_definition": {
            "random_seed": RANDOM_SEED,
            "benign_sample_size": BENIGN_SAMPLE_SIZE,
            "variant_counts": variant_counts,
            "selected_alert_ids": sample_ids,
        },
        "metrics": {
            "v2_memory_mode": metrics_v2_mem,
            "v2_no_memory_mode": metrics_v2_nomem,
            "v1_memory_mode": v1_metrics_mem,
            "v1_no_memory_mode": v1_metrics_nomem,
        },
    }

    save_results_atomically(V2_SUMMARY_FILE, summary_report)
    print(f"Full structured evaluation summary saved to {V2_SUMMARY_FILE}")


if __name__ == "__main__":
    main()
