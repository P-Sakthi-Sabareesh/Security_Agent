"""
SOC Memory Agent
Analyzes replay alerts by recalling historical security investigation experiences
from Hindsight Cloud, deterministically comparing contextual signals, reasoning with Groq LLM,
and enforcing strict SOC safety override rules.
"""

import json
import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import dotenv
import groq
from hindsight_client import Hindsight

# Ensure stdout and stderr support UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Configure logger
logger = logging.getLogger("soc_agent")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] %(levelname)s [%(name)s]: %(message)s", datefmt="%H:%M:%S")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# File Paths & Defaults
DEFAULT_ALERTS_PATH = Path("data") / "alerts.json"
DEFAULT_HINDSIGHT_URL = "https://api.hindsight.vectorize.io"

PRIMARY_MODEL = "openai/gpt-oss-120b"
FALLBACK_MODEL = "qwen/qwen3-32b"

# Flag to ensure we only print the raw Hindsight response once for inspection
_FIRST_RECALL_PRINTED = False

# Fields to ignore during context/details comparison (per-alert unique IDs, tickets, or volatile continuous numbers)
IGNORED_IDENTIFIERS = {
    "change_ticket",
    "onboarding_ticket",
    "ticket_id",
    "ticket",
    "n",
    "request_id",
    "sequence_id",
    "incident_id",
    "session_id",
    "execution_id",
    "process_id",
    "pid",
    "thread_id",
    "bytes_gb",
    "gb",
    "bytes",
    "duration",
    "duration_seconds",
    "gap_minutes",
    "attempts",
    "hosts_probed",
    "ports_scanned",
    "files",
    "contents",
    "command",
}

# Categorical details keys that provide strong behavioral signals
CATEGORICAL_DETAILS_KEYS = {
    "protocol",
    "initiated_from",
    "source_host",
    "device",
    "mfa",
    "action",
    "method",
    "auth_method",
    "source_country",
    "country",
    "country_a",
    "country_b",
    "city",
    "destination",
    "forward_to",
    "via_vpn",
    "then_success",
    "parent",
    "container",
    "group",
    "rule_scope",
    "new_account",
    "purpose",
}

# High-risk signal keys for safety override Rule 2
HIGH_RISK_SIGNALS = {
    "destination",
    "dst",
    "scheduled_job",
    "sensitive_data_involved",
    "sensitive_data_accessed",
    "account_normal_for_action",
    "device",
    "known_device",
    "mfa",
    "mfa_passed",
    "initiated_from",
    "source_host",
}


def load_env_config() -> Tuple[str, str, str, str]:
    """
    Loads API keys and endpoints securely from .env without logging secrets.
    """
    dotenv.load_dotenv(override=True)
    hindsight_api_key = os.environ.get("HINDSIGHT_API_KEY", "").strip()
    bank_id = os.environ.get("HINDSIGHT_BANK_ID", "soc-memory").strip()
    hindsight_url = os.environ.get("HINDSIGHT_API_URL", DEFAULT_HINDSIGHT_URL).strip()
    groq_api_key = os.environ.get("GROQ_API_KEY", "").strip()

    return hindsight_api_key, bank_id, hindsight_url, groq_api_key


def load_alert(alert_id: str, data_path: Path = DEFAULT_ALERTS_PATH) -> Dict[str, Any]:
    """
    Loads an alert record from alerts.json.
    Ensures that only replay alerts (phase == 'replay') are loaded for analysis.
    """
    if not data_path.exists():
        raise FileNotFoundError(f"Alerts dataset not found at {data_path}")

    with open(data_path, "r", encoding="utf-8") as f:
        alerts = json.load(f)

    for alert in alerts:
        if alert.get("alert_id") == alert_id:
            return alert

    raise ValueError(f"Alert ID '{alert_id}' not found in {data_path}")


def build_recall_query(alert: Dict[str, Any]) -> str:
    """
    Builds a targeted semantic search query from a replay alert to recall relevant historical cases.
    """
    title = alert.get("title", "")
    category = alert.get("category", "")
    user = alert.get("user", "")
    host = alert.get("host", "")
    dst = alert.get("dst", "")

    # Extract notable details and context
    details = alert.get("details", {})
    context = alert.get("context", {})

    detail_parts = []
    if isinstance(details, dict):
        for k, v in details.items():
            if k not in IGNORED_IDENTIFIERS:
                detail_parts.append(f"{k} {v}")
    if isinstance(context, dict):
        for k, v in context.items():
            if k not in IGNORED_IDENTIFIERS:
                detail_parts.append(f"{k} {v}")

    extra_str = " ".join(detail_parts)
    query = f"{title} category {category} user {user} host {host} destination {dst} {extra_str}".strip()
    return query


def recall_history(
    client: Hindsight,
    bank_id: str,
    query: str,
    budget: str = "high",
    max_tokens: int = 4096,
) -> List[Any]:
    """
    Calls Hindsight recall to retrieve similar memories.
    For the FIRST recall call, prints the raw response structure/fields for inspection.
    """
    global _FIRST_RECALL_PRINTED

    resp = client.recall(
        bank_id=bank_id,
        query=query,
        budget=budget,
        max_tokens=max_tokens,
    )

    if not _FIRST_RECALL_PRINTED:
        _FIRST_RECALL_PRINTED = True
        print("\n" + "=" * 70)
        print("FIRST HINDSIGHT RECALL RESPONSE STRUCTURE INSPECTION:")
        print("=" * 70)
        print(f"Response Type: {type(resp).__name__}")
        resp_fields = getattr(resp, "__dict__", {}) or (resp.model_dump() if hasattr(resp, "model_dump") else {})
        print(f"Top-level Fields: {list(resp_fields.keys()) if isinstance(resp_fields, dict) else dir(resp)}")

        results = getattr(resp, "results", []) or []
        print(f"Returned Results Count: {len(results)}")
        if results:
            first_item = results[0]
            item_dict = getattr(first_item, "__dict__", {}) or (first_item.model_dump() if hasattr(first_item, "model_dump") else {})
            print(f"Result Item #1 Type: {type(first_item).__name__}")
            print(f"Result Item #1 Fields: {list(item_dict.keys()) if isinstance(item_dict, dict) else dir(first_item)}")
            print(f"Sample Result Item #1 Raw:\n{json.dumps(item_dict, default=str, indent=2)}")
        print("=" * 70 + "\n")

    return getattr(resp, "results", []) or []


def extract_alert_ids(recall_results: List[Any]) -> List[str]:
    """
    Tolerantly extracts historical alert IDs (e.g. ALRT-00001) from recall results.
    Checks document_id, metadata, tags, and text content via regex.
    """
    alert_ids: List[str] = []
    seen: Set[str] = set()

    for item in recall_results:
        # Check document_id
        doc_id = getattr(item, "document_id", None)
        if doc_id and doc_id.startswith("ALRT-") and doc_id not in seen:
            seen.add(doc_id)
            alert_ids.append(doc_id)

        # Check metadata
        meta = getattr(item, "metadata", None)
        if isinstance(meta, dict):
            m_id = meta.get("alert_id")
            if m_id and m_id.startswith("ALRT-") and m_id not in seen:
                seen.add(m_id)
                alert_ids.append(m_id)

        # Check tags
        tags = getattr(item, "tags", None) or []
        for tag in tags:
            if isinstance(tag, str) and tag.startswith("alert_id:"):
                t_id = tag.split("alert_id:", 1)[1].strip()
                if t_id and t_id not in seen:
                    seen.add(t_id)
                    alert_ids.append(t_id)

        # Check text via regex ALRT-\d{5}
        text = getattr(item, "text", "") or ""
        matches = re.findall(r"ALRT-\d{5}", text)
        for m in matches:
            if m not in seen:
                seen.add(m)
                alert_ids.append(m)

    return alert_ids


def lookup_history(
    alert_ids: List[str], data_path: Path = DEFAULT_ALERTS_PATH
) -> List[Dict[str, Any]]:
    """
    Loads the original full records from alerts.json for recalled alert_ids.
    Requires phase == 'history'.
    """
    if not alert_ids or not data_path.exists():
        return []

    with open(data_path, "r", encoding="utf-8") as f:
        all_alerts = json.load(f)

    history_by_id = {
        a["alert_id"]: a
        for a in all_alerts
        if a.get("phase") == "history" and "alert_id" in a
    }

    results = []
    for aid in alert_ids:
        if aid in history_by_id:
            results.append(history_by_id[aid])

    return results


def _are_values_equal(v1: Any, v2: Any) -> bool:
    """
    Helper to check equality between two values, distinguishing False, None, and '<missing>',
    and normalizing strings.
    """
    if v1 is v2:
        return True
    if type(v1) is not type(v2):
        return False
    if isinstance(v1, str) and isinstance(v2, str):
        return v1.strip().lower() == v2.strip().lower()
    return v1 == v2


def compare_context(current_alert: Dict[str, Any], past_alert: Dict[str, Any]) -> Dict[str, Any]:
    """
    Dynamically compares all relevant contextual and details signals between current replay alert
    and a past historical alert.

    Requirements:
    - Compares all categorical/boolean context signals that exist in either historical or current alert.
    - Compares explicit destination, user, and host.
    - Correctly distinguishes missing key ('<missing>'), null/None, False, and True.
    - Treats any difference in a boolean/categorical context signal as a key difference.
    - Includes actual 'past' and 'current' values in every reported difference.
    - Inspects 'details' for categorical/boolean values and ignores unique identifiers/tickets.
    """
    matches: List[str] = []
    differences: List[Dict[str, Any]] = []

    # 1. Compare Core Top-level Signals: destination, user, host
    core_signals = [
        ("user", past_alert.get("user"), current_alert.get("user"), False),
        ("host", past_alert.get("host"), current_alert.get("host"), False),
    ]

    past_dst = past_alert.get("dst") or (past_alert.get("details", {}) or {}).get("destination")
    curr_dst = current_alert.get("dst") or (current_alert.get("details", {}) or {}).get("destination")
    core_signals.append(("destination", past_dst, curr_dst, True))

    for sig_name, p_val, c_val, is_key in core_signals:
        p_val_norm = "<missing>" if p_val is None and sig_name not in past_alert else p_val
        c_val_norm = "<missing>" if c_val is None and sig_name not in current_alert else c_val

        if _are_values_equal(p_val, c_val):
            matches.append(sig_name)
        else:
            differences.append({
                "signal": sig_name,
                "past": p_val_norm,
                "current": c_val_norm,
                "is_key_signal": is_key or (sig_name in HIGH_RISK_SIGNALS),
            })

    # 2. Dynamically Compare All Context Signals
    past_ctx = past_alert.get("context", {}) or {}
    curr_ctx = current_alert.get("context", {}) or {}

    all_ctx_keys = sorted(list(set(past_ctx.keys()) | set(curr_ctx.keys())))

    for k in all_ctx_keys:
        if k in IGNORED_IDENTIFIERS:
            continue

        p_present = k in past_ctx
        c_present = k in curr_ctx

        p_val = past_ctx[k] if p_present else "<missing>"
        c_val = curr_ctx[k] if c_present else "<missing>"

        # Check equality with distinct missing / None / False / True
        if p_present and c_present and _are_values_equal(p_val, c_val):
            matches.append(k)
        else:
            differences.append({
                "signal": k,
                "past": p_val,
                "current": c_val,
                # Any difference in a boolean/categorical context signal is a key difference
                "is_key_signal": True,
            })

    # 3. Compare Categorical and Boolean Details Signals
    past_det = past_alert.get("details", {}) or {}
    curr_det = current_alert.get("details", {}) or {}

    all_det_keys = sorted(list(set(past_det.keys()) | set(curr_det.keys())))

    for k in all_det_keys:
        if k in IGNORED_IDENTIFIERS or k in ["destination", "dst"]:
            continue

        p_present = k in past_det
        c_present = k in curr_det

        p_val = past_det[k] if p_present else "<missing>"
        c_val = curr_det[k] if c_present else "<missing>"

        # Only evaluate if the key is a known categorical field or holds boolean/categorical data
        is_categorical = (
            k in CATEGORICAL_DETAILS_KEYS
            or isinstance(p_val, bool)
            or isinstance(c_val, bool)
            or (isinstance(p_val, str) and len(p_val) < 64 and not p_val.startswith("http"))
            or (isinstance(c_val, str) and len(c_val) < 64 and not c_val.startswith("http"))
        )

        if not is_categorical:
            continue

        if p_present and c_present and _are_values_equal(p_val, c_val):
            if k not in matches:
                matches.append(k)
        else:
            is_key_sig = k in HIGH_RISK_SIGNALS or k in ["protocol", "initiated_from", "device", "mfa", "via_vpn"]
            differences.append({
                "signal": k,
                "past": p_val,
                "current": c_val,
                "is_key_signal": is_key_sig,
            })

    key_diff_count = sum(1 for d in differences if d.get("is_key_signal"))
    total_diff_count = len(differences)

    return {
        "alert_id": past_alert.get("alert_id"),
        "title": past_alert.get("title"),
        "category": past_alert.get("category"),
        "severity": past_alert.get("severity"),
        "host": past_alert.get("host"),
        "user": past_alert.get("user"),
        "verdict": past_alert.get("verdict"),
        "outcome": past_alert.get("outcome"),
        "investigation_note": past_alert.get("investigation_note"),
        "analyst": past_alert.get("analyst"),
        "matches": matches,
        "differences": differences,
        "key_difference_count": key_diff_count,
        "total_difference_count": total_diff_count,
    }


def pick_best_match(
    current_alert: Dict[str, Any], compared_cases: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """
    Selects the single best-matching historical case based on:
    1. Same scenario title / category
    2. Same host / asset context
    3. Fewest key signal differences
    4. Most matching signals
    """
    if not compared_cases:
        return None

    curr_host = str(current_alert.get("host", "")).lower().strip()
    curr_title = str(current_alert.get("title", "")).lower().strip()
    curr_cat = str(current_alert.get("category", "")).lower().strip()

    def score_case(c: Dict[str, Any]) -> Tuple[int, int, int, int, int]:
        past_host = str(c.get("host") or "").lower().strip()
        past_title = str(c.get("title") or "").lower().strip()
        past_cat = str(c.get("category") or "").lower().strip()

        title_match = 0 if past_title == curr_title else 1
        host_match = 0 if past_host == curr_host else 1
        cat_match = 0 if past_cat == curr_cat else 1
        key_diffs = c.get("key_difference_count", 0)
        matches_count = -len(c.get("matches", []))

        return (title_match, host_match, cat_match, key_diffs, matches_count)

    sorted_cases = sorted(compared_cases, key=score_case)
    return sorted_cases[0]


def _clean_json_response(raw_text: str) -> str:
    """
    Strips reasoning blocks, markdown code blocks, backticks, and extraneous preamble
    to extract the JSON object.
    """
    text = raw_text.strip()

    # Strip reasoning tags like <think>...</think> if present
    text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE).strip()

    # Match markdown code fences ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if match:
        text = match.group(1).strip()

    # Extract outermost { ... }
    json_match = re.search(r"(\{[\s\S]*\})", text)
    if json_match:
        return json_match.group(1).strip()

    return text


_GROQ_MODELS_CACHE: Optional[Set[str]] = None

def get_available_groq_models(client: groq.Groq) -> Set[str]:
    """
    Queries the Groq API model listing to verify actual available models, with caching.
    """
    global _GROQ_MODELS_CACHE
    if _GROQ_MODELS_CACHE is not None:
        return _GROQ_MODELS_CACHE

    try:
        models_data = client.models.list().data
        _GROQ_MODELS_CACHE = {m.id for m in models_data}
        return _GROQ_MODELS_CACHE
    except Exception as e:
        logger.warning(f"Failed to query Groq model list: {e}")
        return set()


def reason_with_llm(
    current_alert: Dict[str, Any],
    recalled_cases: List[Dict[str, Any]],
    best_match: Optional[Dict[str, Any]],
    groq_api_key: str,
    is_no_memory: bool = False,
) -> Dict[str, Any]:
    """
    Invokes Groq LLM (Primary: openai/gpt-oss-120b, Fallback: qwen/qwen3-32b)
    Verifies model availability on Groq before attempting fallbacks and records models_tried.
    """
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY is not set.")

    client = groq.Groq(api_key=groq_api_key)

    system_prompt = (
        "You are an expert Security Operations Center (SOC) Tier-3 Lead Analyst. "
        "Analyze the provided security alert and any past historical investigation context. "
        "You must evaluate whether the current alert is benign (routine/expected pattern), "
        "requires analyst review due to contextual variations, or is a true positive / novel threat.\n\n"
        "STATE DEFINITIONS:\n"
        "- green: Routine/expected benign positive. All contextual signals match an established benign historical pattern.\n"
        "- yellow: Suspicious or partially matching past pattern with notable contextual differences. Requires analyst triage.\n"
        "- red: High risk, critical severity, true positive, novel threat, or significant discrepancy in key security signals.\n\n"
        "RESPONSE REQUIREMENT:\n"
        "You must respond ONLY with a valid JSON object in this exact schema (no preamble, no markdown formatting outside JSON):\n"
        "{\n"
        '  "state": "green" | "yellow" | "red",\n'
        '  "reasons": ["detailed reason 1", "detailed reason 2"],\n'
        '  "recalled_case_ids": ["ALRT-xxxxx"],\n'
        '  "recommended_action": "actionable instruction for SOC analyst",\n'
        '  "explanation": "concise executive summary of findings"\n'
        "}"
    )

    current_summary = {
        "alert_id": current_alert.get("alert_id"),
        "timestamp": current_alert.get("timestamp"),
        "title": current_alert.get("title"),
        "category": current_alert.get("category"),
        "severity": current_alert.get("severity"),
        "user": current_alert.get("user"),
        "host": current_alert.get("host"),
        "dst": current_alert.get("dst"),
        "details": current_alert.get("details"),
        "context": current_alert.get("context"),
    }

    if is_no_memory:
        user_prompt = (
            f"CURRENT ALERT TO ANALYZE (No memory context available):\n"
            f"{json.dumps(current_summary, indent=2)}\n\n"
            "Analyze this alert in isolation. Provide your evaluation in the required JSON format."
        )
    else:
        best_match_summary = None
        if best_match:
            best_match_summary = {
                "alert_id": best_match.get("alert_id"),
                "title": best_match.get("title"),
                "host": best_match.get("host"),
                "user": best_match.get("user"),
                "verdict": best_match.get("verdict"),
                "outcome": best_match.get("outcome"),
                "analyst": best_match.get("analyst"),
                "investigation_note": best_match.get("investigation_note"),
                "matching_signals": best_match.get("matches", []),
                "differing_signals": [
                    f"{d['signal']}: past={d['past']} vs current={d['current']}"
                    for d in best_match.get("differences", [])
                ],
            }

        other_cases_summary = []
        for c in recalled_cases:
            if best_match and c.get("alert_id") == best_match.get("alert_id"):
                continue
            other_cases_summary.append({
                "alert_id": c.get("alert_id"),
                "title": c.get("title"),
                "host": c.get("host"),
                "verdict": c.get("verdict"),
                "outcome": c.get("outcome"),
                "matching_signals": c.get("matches", []),
                "differing_signals": [
                    f"{d['signal']}: past={d['past']} vs current={d['current']}"
                    for d in c.get("differences", [])[:3]
                ],
            })
            if len(other_cases_summary) >= 3:
                break

        user_prompt = (
            f"CURRENT ALERT TO ANALYZE:\n"
            f"{json.dumps(current_summary, indent=2)}\n\n"
            f"BEST-MATCHING HISTORICAL INVESTIGATION BASELINE:\n"
            f"{json.dumps(best_match_summary, indent=2) if best_match_summary else 'None'}\n\n"
            f"OTHER RECALLED HISTORICAL CASES:\n"
            f"{json.dumps(other_cases_summary, indent=2)}\n\n"
            "Compare the current alert against the historical baseline. Note any matches or differences in key signals "
            "(destination, scheduled jobs, sensitive data, devices, MFA, user account behavior). "
            "Provide your assessment in the required JSON format."
        )

    models_tried: List[str] = []
    available_models = get_available_groq_models(client)

    # 1. Attempt Primary Model
    models_tried.append(PRIMARY_MODEL)
    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model=PRIMARY_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.0,
            )
            raw_content = response.choices[0].message.content or ""
            cleaned = _clean_json_response(raw_content)
            parsed = json.loads(cleaned)

            # Validate and normalize
            state = str(parsed.get("state", "yellow")).lower()
            if state not in ["green", "yellow", "red"]:
                state = "yellow"
            parsed["state"] = state

            if "reasons" not in parsed or not isinstance(parsed["reasons"], list):
                parsed["reasons"] = [parsed.get("explanation", "Evaluated by LLM")]
            if "recalled_case_ids" not in parsed or not isinstance(parsed["recalled_case_ids"], list):
                parsed["recalled_case_ids"] = [best_match["alert_id"]] if best_match else []
            if "recommended_action" not in parsed:
                parsed["recommended_action"] = "Analyst review recommended."
            if "explanation" not in parsed:
                parsed["explanation"] = "; ".join(parsed["reasons"])

            parsed["model_used"] = PRIMARY_MODEL
            parsed["models_tried"] = models_tried
            return parsed

        except Exception as primary_err:
            if attempt == 1:
                logger.warning(f"Primary model {PRIMARY_MODEL} failed: {primary_err}. Attempting fallback verification.")
            time.sleep(1.0)

    # 2. Attempt Fallback Model (qwen/qwen3-32b) with API verification
    models_tried.append(FALLBACK_MODEL)
    if FALLBACK_MODEL not in available_models:
        err_msg = (
            f"Fallback model '{FALLBACK_MODEL}' is unavailable on Groq API. "
            f"Available models: {sorted(list(available_models))}"
        )
        logger.error(err_msg)
        return {
            "state": "yellow",
            "reasons": [
                f"Primary model {PRIMARY_MODEL} failed.",
                f"Requested fallback '{FALLBACK_MODEL}' verified as unavailable on Groq API.",
            ],
            "recalled_case_ids": [best_match["alert_id"]] if best_match else [],
            "recommended_action": "Perform manual human review due to reasoning engine unavailability.",
            "explanation": "Primary LLM failed and fallback model is unavailable on Groq API.",
            "model_used": "fallback_rule",
            "models_tried": models_tried,
        }

    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model=FALLBACK_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.0,
            )
            raw_content = response.choices[0].message.content or ""
            cleaned = _clean_json_response(raw_content)
            parsed = json.loads(cleaned)

            state = str(parsed.get("state", "yellow")).lower()
            if state not in ["green", "yellow", "red"]:
                state = "yellow"
            parsed["state"] = state
            parsed["model_used"] = FALLBACK_MODEL
            parsed["models_tried"] = models_tried
            return parsed

        except Exception as fallback_err:
            logger.error(f"Fallback model {FALLBACK_MODEL} failed: {fallback_err}")
            time.sleep(1.0)

    return {
        "state": "yellow",
        "reasons": [f"All attempted LLM models failed ({models_tried})."],
        "recalled_case_ids": [best_match["alert_id"]] if best_match else [],
        "recommended_action": "Perform manual human review due to reasoning engine unavailability.",
        "explanation": "Automated LLM reasoning failed across all models.",
        "model_used": "fallback_rule",
        "models_tried": models_tried,
    }


def apply_safety_rules(
    current_alert: Dict[str, Any],
    best_match_case: Optional[Dict[str, Any]],
    recalled_cases: List[Dict[str, Any]],
    llm_result: Dict[str, Any],
    is_no_memory: bool = False,
) -> Dict[str, Any]:
    """
    Enforces deterministic SOC Safety Overrides AFTER the LLM reasoning step.
    The LLM cannot bypass these safety rules.

    Rule 1: severity == Critical -> state = red, recommended_action = human review.
    Rule 2: If ANY key signal differs in best-matching case (destination, scheduled job, sensitive data,
            device, MFA, account) -> state can NEVER be green.
    Rule 3: No similar historical case found -> state = red, mark as novel.
    Rule 4: Never auto-close anything. GREEN alerts must require analyst quick-confirm.
    Rule 5: State semantics:
      - GREEN only if best-matching past case had benign/closed outcome AND all key signals match it.
      - YELLOW if similar case exists but there are contextual differences (analyst review needed).
      - RED if novel, Critical, high-risk differences, closest cases were escalated/true positives, or a safety override triggered.
    """
    final_state = llm_result.get("state", "yellow")
    reasons = list(llm_result.get("reasons", []))
    recommended_action = llm_result.get("recommended_action", "Analyst review.")
    explanation = llm_result.get("explanation", "")
    overrides_triggered = []

    severity = str(current_alert.get("severity", "")).capitalize()

    # Rule 1: Critical Severity Safety Override
    if severity == "Critical":
        if final_state != "red":
            overrides_triggered.append("Rule 1: Alert severity is Critical -> Forced state to RED.")
            final_state = "red"
        recommended_action = "Immediate Priority 1 human analyst review and threat containment."

    if not is_no_memory:
        # Rule 3: No similar historical cases found -> State = RED, mark as novel
        if not recalled_cases or not best_match_case:
            if final_state != "red":
                overrides_triggered.append("Rule 3: No matching historical experiences found -> Marked as NOVEL and forced state to RED.")
                final_state = "red"
            reasons.append("Novel scenario: No prior investigation precedent found in memory bank.")
            recommended_action = "Escalate for full investigation as an unclassified/novel alert pattern."

        else:
            # Rule 2: Key signal differences in best-matching case prevent GREEN
            key_differences = [
                d for d in best_match_case.get("differences", [])
                if d.get("is_key_signal") or d.get("signal") in HIGH_RISK_SIGNALS
            ]

            if key_differences:
                diff_summary = ", ".join(f"{d['signal']} (past={d['past']}, current={d['current']})" for d in key_differences)

                # High risk differences include sensitive data involved, unknown external IP, abnormal account action, unapproved source host
                has_high_risk = any(
                    (d["signal"] in ["sensitive_data_involved", "sensitive_data_accessed"] and d["current"] is True)
                    or (d["signal"] == "account_normal_for_action" and d["current"] is False)
                    or (d["signal"] in ["destination", "dst"] and str(d["current"]).replace(".", "").isdigit())
                    or (d["signal"] == "destination_in_inventory" and d["current"] is False)
                    for d in best_match_case.get("differences", [])
                )

                if has_high_risk and final_state != "red":
                    final_state = "red"
                    overrides_triggered.append(
                        f"Rule 2 & 5: High-risk contextual discrepancies detected against baseline {best_match_case['alert_id']} ({diff_summary}) -> Forced state to RED."
                    )
                elif final_state == "green":
                    overrides_triggered.append(
                        f"Rule 2: Key signal discrepancies detected against baseline {best_match_case['alert_id']} ({diff_summary}) -> State CANNOT be GREEN (downgraded to YELLOW)."
                    )
                    final_state = "yellow"

                reasons.append(f"Contextual discrepancies with baseline {best_match_case['alert_id']}: {diff_summary}")

            # Rule 5 check: Prior case verdict
            past_verdict = str(best_match_case.get("verdict", ""))
            past_outcome = str(best_match_case.get("outcome", ""))
            if past_verdict in ["TruePositive", "Malicious", "Escalated"] or "incident" in past_outcome.lower():
                if final_state != "red":
                    overrides_triggered.append(
                        f"Rule 5: Historical precedent {best_match_case['alert_id']} was a confirmed TruePositive/Escalated incident -> Forced state to RED."
                    )
                    final_state = "red"

            # Check if GREEN is actually justified
            if final_state == "green":
                if key_differences or past_verdict not in ["BenignPositive", "FalsePositive", "Closed"]:
                    final_state = "yellow"
                    overrides_triggered.append("Rule 5: GREEN requirement not met -> Set to YELLOW.")

    # Rule 4: Never auto-close anything. Enforce strict analyst confirmation on GREEN.
    if final_state == "green":
        recommended_action = "Low risk, matches a known recurring pattern. Analyst quick-confirm."
    else:
        # Sanitize recommended action across all states
        for phrase in [
            "close the alert",
            "automatically close",
            "auto-close",
            "mark as benign and close",
            "no further investigation needed",
            "close alert",
        ]:
            if phrase in recommended_action.lower():
                recommended_action = "Analyst review recommended."

    return {
        "state": final_state,
        "reasons": reasons,
        "recalled_case_ids": llm_result.get("recalled_case_ids", [best_match_case["alert_id"]] if best_match_case else []),
        "recommended_action": recommended_action,
        "explanation": explanation,
        "overrides_triggered": overrides_triggered,
        "model_used": llm_result.get("model_used", "N/A"),
        "models_tried": llm_result.get("models_tried", [PRIMARY_MODEL]),
    }


class SOCMemoryAgent:
    """
    Main SOC Memory Agent coordinator.
    """

    def __init__(
        self,
        hindsight_api_key: Optional[str] = None,
        bank_id: Optional[str] = None,
        hindsight_url: Optional[str] = None,
        groq_api_key: Optional[str] = None,
    ):
        env_h_key, env_bank, env_url, env_groq = load_env_config()
        self.hindsight_api_key = hindsight_api_key or env_h_key
        self.bank_id = bank_id or env_bank
        self.hindsight_url = hindsight_url or env_url
        self.groq_api_key = groq_api_key or env_groq

        self.client = Hindsight(base_url=self.hindsight_url, api_key=self.hindsight_api_key)

    def close(self):
        """Closes underlying client connections cleanly."""
        try:
            self.client.close()
        except Exception:
            pass

    def analyze_alert(self, alert_input: Any) -> Dict[str, Any]:
        """
        Executes full SOC analysis with Hindsight long-term memory.
        """
        # Step 0: Load alert
        if isinstance(alert_input, str):
            alert = load_alert(alert_input)
        elif isinstance(alert_input, dict):
            alert = alert_input
        else:
            raise ValueError(f"Unsupported alert input type: {type(alert_input)}")

        alert_id = alert.get("alert_id", "UNKNOWN")

        # Step 1: Recall from Hindsight
        query = build_recall_query(alert)
        recall_results = recall_history(self.client, self.bank_id, query)

        # Step 2: Extract historical alert IDs and lookup full records
        recalled_ids = extract_alert_ids(recall_results)
        history_records = lookup_history(recalled_ids)

        # Step 3: Deterministic Context Comparison
        compared_cases = [compare_context(alert, hist) for hist in history_records]
        best_match = pick_best_match(alert, compared_cases)

        # Step 4: LLM Reasoning
        llm_output = reason_with_llm(
            current_alert=alert,
            recalled_cases=compared_cases,
            best_match=best_match,
            groq_api_key=self.groq_api_key,
            is_no_memory=False,
        )

        # Step 5: Safety Overrides
        final_assessment = apply_safety_rules(
            current_alert=alert,
            best_match_case=best_match,
            recalled_cases=compared_cases,
            llm_result=llm_output,
            is_no_memory=False,
        )

        return {
            "alert_id": alert_id,
            "memory_used": True,
            "recalled_cases": compared_cases,
            "best_match_id": best_match["alert_id"] if best_match else None,
            "best_match": best_match,
            "llm_result": llm_output,
            "models_tried": final_assessment.get("models_tried", [PRIMARY_MODEL]),
            "state": final_assessment["state"],
            "recommended_action": final_assessment["recommended_action"],
            "reasons": final_assessment["reasons"],
            "explanation": final_assessment["explanation"],
            "safety_overrides": final_assessment["overrides_triggered"],
        }

    def analyze_without_memory(self, alert_input: Any) -> Dict[str, Any]:
        """
        Executes isolated alert analysis without memory recall.
        """
        if isinstance(alert_input, str):
            alert = load_alert(alert_input)
        elif isinstance(alert_input, dict):
            alert = alert_input
        else:
            raise ValueError(f"Unsupported alert input type: {type(alert_input)}")

        alert_id = alert.get("alert_id", "UNKNOWN")

        # LLM Reasoning without memory
        llm_output = reason_with_llm(
            current_alert=alert,
            recalled_cases=[],
            best_match=None,
            groq_api_key=self.groq_api_key,
            is_no_memory=True,
        )

        # Safety Overrides (Rule 1 & 4 apply)
        final_assessment = apply_safety_rules(
            current_alert=alert,
            best_match_case=None,
            recalled_cases=[],
            llm_result=llm_output,
            is_no_memory=True,
        )

        return {
            "alert_id": alert_id,
            "memory_used": False,
            "recalled_cases": [],
            "best_match_id": None,
            "best_match": None,
            "llm_result": llm_output,
            "models_tried": final_assessment.get("models_tried", [PRIMARY_MODEL]),
            "state": final_assessment["state"],
            "recommended_action": final_assessment["recommended_action"],
            "reasons": final_assessment["reasons"],
            "explanation": final_assessment["explanation"],
            "safety_overrides": final_assessment["overrides_triggered"],
        }


# Convenience standalone functions
def analyze_alert(alert_id_or_dict: Any) -> Dict[str, Any]:
    agent = SOCMemoryAgent()
    try:
        return agent.analyze_alert(alert_id_or_dict)
    finally:
        agent.close()


def analyze_without_memory(alert_id_or_dict: Any) -> Dict[str, Any]:
    agent = SOCMemoryAgent()
    try:
        return agent.analyze_without_memory(alert_id_or_dict)
    finally:
        agent.close()
