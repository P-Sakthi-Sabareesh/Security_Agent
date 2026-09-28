"""
Hindy SOC Memory Agent - FastAPI Backend
Provides REST endpoints to access security alerts, check memory-core health,
trigger memory-driven / no-memory alert investigations, perform live memory retention,
execute reset operations, and generate grounded investigation checks.
"""

import datetime
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

import groq
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from hindsight_client import Hindsight
from pydantic import BaseModel, Field

# Ensure workspace root is in sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from agent.soc_agent import (
    DEFAULT_ALERTS_PATH,
    DEFAULT_OVERRIDES_PATH,
    SOCMemoryAgent,
    analyze_alert,
    analyze_without_memory,
    load_alert,
    load_env_config,
)
from scripts.load_history import format_security_experience

# Configure logging
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
logger = logging.getLogger("hindy_api")

app = FastAPI(
    title="Hindy SOC Memory Agent API",
    description="Backend API for Hindy SOC Memory Agent powered by Hindsight and Groq.",
    version="2.0.0",
)

# Enable CORS for localhost frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RESULTS_DIR = WORKSPACE_ROOT / "results"
DEMO_CACHE_FILE = RESULTS_DIR / "demo_cache.json"
DEMO_PAIR_FILE = WORKSPACE_ROOT / "api" / "demo_pair.json"


def _load_demo_cache() -> Dict[str, Any]:
    """Loads cache from disk."""
    if not DEMO_CACHE_FILE.exists():
        return {}
    try:
        with open(DEMO_CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to read demo cache: {e}")
        return {}


def _save_demo_cache(cache_data: Dict[str, Any]) -> None:
    """Atomically saves cache to disk."""
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    temp_file = DEMO_CACHE_FILE.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(cache_data, f, indent=2, default=str)
    temp_file.replace(DEMO_CACHE_FILE)


def _load_historical_metadata_map() -> Dict[str, Dict[str, Any]]:
    """Loads history alerts to supply timestamp/date for recalled memory cards."""
    history_map = {}
    if DEFAULT_ALERTS_PATH.exists():
        try:
            with open(DEFAULT_ALERTS_PATH, "r", encoding="utf-8") as f:
                all_alerts = json.load(f)
            for a in all_alerts:
                if a.get("phase") == "history" and "alert_id" in a:
                    history_map[a["alert_id"]] = a
        except Exception:
            pass

    if DEFAULT_OVERRIDES_PATH.exists():
        try:
            with open(DEFAULT_OVERRIDES_PATH, "r", encoding="utf-8") as f:
                overrides = json.load(f)
            for a in overrides:
                if "alert_id" in a:
                    history_map[a["alert_id"]] = a
        except Exception:
            pass

    return history_map


def _load_demo_pair_ids() -> List[str]:
    """Loads demo pair alert IDs if defined."""
    if not DEMO_PAIR_FILE.exists():
        return []
    try:
        with open(DEMO_PAIR_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [data.get("first_alert_id"), data.get("second_alert_id")]
    except Exception:
        return []


def _load_decided_alert_ids() -> Set[str]:
    """Loads alert IDs that have been confirmed and stored in analyst_overrides.json."""
    if not DEFAULT_OVERRIDES_PATH.exists():
        return set()
    try:
        with open(DEFAULT_OVERRIDES_PATH, "r", encoding="utf-8") as f:
            overrides = json.load(f)
            decided = set()
            for o in overrides:
                aid = o.get("alert_id", "")
                if aid.endswith("-live"):
                    decided.add(aid[:-5])
                else:
                    decided.add(aid)
            return decided
    except Exception:
        return set()


@app.get("/api/health")
def get_health() -> Dict[str, Any]:
    """
    Checks memory core configuration and status.
    Used by the login page to determine memory-core connectivity.
    """
    h_key, bank_id, h_url, groq_key = load_env_config()
    
    memory_online = bool(h_key and bank_id)
    groq_online = bool(groq_key)
    
    return {
        "status": "online" if (memory_online and groq_online) else "degraded",
        "memory_core_online": memory_online,
        "reasoning_engine_online": groq_online,
        "bank_id": bank_id,
        "agent": "Hindy Experience-Driven SOC Agent",
    }


@app.get("/api/demo-pair")
def get_demo_pair() -> Dict[str, Any]:
    """
    Returns the configured demonstration learning pair metadata.
    """
    if not DEMO_PAIR_FILE.exists():
        raise HTTPException(status_code=404, detail="No learning pair configured.")
    try:
        with open(DEMO_PAIR_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read demo pair: {e}")


@app.get("/api/alerts")
def list_alerts() -> List[Dict[str, Any]]:
    """
    Returns replay alerts only (phase == 'replay').
    Exposes only: id, timestamp, title, severity, host, user, cached_state, is_learning_pair, is_decided.
    Does NOT expose verdict or ground-truth fields.
    """
    if not DEFAULT_ALERTS_PATH.exists():
        raise HTTPException(status_code=404, detail="Alerts dataset not found.")

    with open(DEFAULT_ALERTS_PATH, "r", encoding="utf-8") as f:
        alerts = json.load(f)

    cache = _load_demo_cache()
    pair_ids = _load_demo_pair_ids()
    decided_ids = _load_decided_alert_ids()

    replay_alerts = []
    for a in alerts:
        if a.get("phase") == "replay":
            aid = a.get("alert_id")
            
            # Check if cached state exists for badge dot
            cached_state = None
            cache_key = f"{aid}:memory"
            if cache_key in cache and isinstance(cache[cache_key], dict):
                cached_state = cache[cache_key].get("state")

            replay_alerts.append({
                "id": aid,
                "timestamp": a.get("timestamp"),
                "title": a.get("title"),
                "severity": a.get("severity"),
                "host": a.get("host"),
                "user": a.get("user"),
                "cached_state": cached_state,
                "is_learning_pair": aid in pair_ids,
                "is_decided": aid in decided_ids,
            })

    return replay_alerts


@app.get("/api/alerts/{alert_id}")
def get_alert_detail(alert_id: str) -> Dict[str, Any]:
    """
    Returns the full real alert for replay.
    """
    try:
        alert = load_alert(alert_id)
        if alert.get("phase") != "replay":
            raise HTTPException(status_code=400, detail="Only replay alerts are accessible for investigation.")
        return alert
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze/{alert_id}")
def analyze_alert_endpoint(
    alert_id: str,
    mode: str = Query("memory", regex="^(memory|nomemory)$"),
    bypass_cache: bool = Query(False),
) -> Dict[str, Any]:
    """
    Analyzes an alert using the real SOCMemoryAgent.
    mode=memory: analyze_alert(alert_id)
    mode=nomemory: analyze_without_memory(alert_id)
    
    If cached in results/demo_cache.json and bypass_cache is False, returns cached result with cached=True.
    If live call fails, returns cached result if exists or 503 error.
    """
    try:
        alert = load_alert(alert_id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")

    cache = _load_demo_cache()
    cache_key = f"{alert_id}:{mode}"

    # Check cache first if not explicitly bypassed
    if not bypass_cache and cache_key in cache:
        cached_result = dict(cache[cache_key])
        cached_result["cached"] = True
        return cached_result

    # Run live agent call
    try:
        agent = SOCMemoryAgent()
        history_map = _load_historical_metadata_map()
        try:
            if mode == "nomemory":
                result = agent.analyze_without_memory(alert)
            else:
                result = agent.analyze_alert(alert)
                
                # Enrich recalled cases with historical date/timestamp from real lookup
                if "recalled_cases" in result:
                    for c in result["recalled_cases"]:
                        cid = c.get("alert_id")
                        if cid in history_map:
                            c["timestamp"] = history_map[cid].get("timestamp")
                            c["day"] = history_map[cid].get("day")
                            c["mitre_technique"] = history_map[cid].get("mitre_technique")
                if result.get("best_match") and result["best_match"].get("alert_id") in history_map:
                    b_id = result["best_match"]["alert_id"]
                    result["best_match"]["timestamp"] = history_map[b_id].get("timestamp")
                    result["best_match"]["day"] = history_map[b_id].get("day")

        finally:
            agent.close()

        # Save to demo cache
        result["cached"] = False
        cache[cache_key] = result
        _save_demo_cache(cache)

        return result

    except Exception as e:
        logger.error(f"Live analysis failed for {alert_id} ({mode}): {e}")
        # Fallback to cache if available
        if cache_key in cache:
            cached_result = dict(cache[cache_key])
            cached_result["cached"] = True
            return cached_result
        
        raise HTTPException(
            status_code=503,
            detail="Reasoning engine unavailable. Please ensure Groq and Hindsight API credentials are valid.",
        )


class DecisionRequest(BaseModel):
    alert_id: str
    decision: str
    reason: str


@app.post("/api/decision")
def submit_decision(req: DecisionRequest) -> Dict[str, Any]:
    """
    Submits an explicit human analyst decision for an alert.
    Executes mandatory sequential order of operations:
    1. Validate decision and reason (>= 10 chars).
    2. Build structured live history record with alert_id: '<current_alert_id>-live'.
    3. Format using format_security_experience from scripts/load_history.py.
    4. Retain to Hindsight Cloud with document_id and tags.
    5. Verify retain succeeded before local persistence.
    6. Append record to data/analyst_overrides.json.
    7. Return success and message 'Memory evolved'.
    """
    # 1. Validation
    if req.decision not in ["Confirmed malicious", "Confirmed benign"]:
        raise HTTPException(
            status_code=400,
            detail="Decision must be either 'Confirmed malicious' or 'Confirmed benign'.",
        )

    reason = req.reason.strip()
    if len(reason) < 10:
        raise HTTPException(
            status_code=400,
            detail="Investigation note/reason must be at least 10 characters.",
        )

    try:
        current_alert = load_alert(req.alert_id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Alert '{req.alert_id}' not found.")

    live_id = f"{req.alert_id}-live"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    is_malicious = req.decision == "Confirmed malicious"
    verdict = "TruePositive" if is_malicious else "BenignPositive"
    outcome = "Confirmed malicious - escalated (live)" if is_malicious else "Closed - analyst-confirmed benign (live)"

    # 2. Build live record
    live_record: Dict[str, Any] = {
        "alert_id": live_id,
        "timestamp": now_iso,
        "title": current_alert.get("title", ""),
        "category": current_alert.get("category", ""),
        "severity": current_alert.get("severity", ""),
        "user": current_alert.get("user", ""),
        "host": current_alert.get("host", ""),
        "src_ip": current_alert.get("src_ip", ""),
        "dst": current_alert.get("dst", ""),
        "details": current_alert.get("details", {}),
        "context": current_alert.get("context", {}),
        "analyst": "Priya Nair (demo)",
        "investigation_note": reason,
        "verdict": verdict,
        "outcome": outcome,
        "phase": "history",
    }

    # 3. Format using existing formatter from scripts/load_history.py
    content = format_security_experience(live_record)

    # 4. Retain to Hindsight
    h_key, bank_id, h_url, _ = load_env_config()
    if not h_key or not bank_id:
        raise HTTPException(status_code=500, detail="Hindsight credentials not configured in .env.")

    client = Hindsight(base_url=h_url, api_key=h_key)
    try:
        metadata = {
            "alert_id": live_id,
            "title": str(live_record.get("title", "")),
            "analyst": str(live_record.get("analyst", "")),
            "verdict": verdict,
            "category": str(live_record.get("category", "")),
            "severity": str(live_record.get("severity", "")),
        }
        tags = [
            f"alert_id:{live_id}",
            f"category:{str(live_record.get('category', '')).lower()}",
            f"verdict:{verdict.lower()}",
            f"severity:{str(live_record.get('severity', '')).lower()}",
            "source:live-override",
        ]

        resp = client.retain(
            bank_id=bank_id,
            content=content,
            document_id=live_id,
            metadata=metadata,
            tags=tags,
        )

        if hasattr(resp, "success") and resp.success is False:
            raise RuntimeError("Hindsight API responded with success=False.")

    except Exception as e:
        logger.error(f"Hindsight retention failed for {live_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Hindsight retention failed: {str(e)}",
        )
    finally:
        try:
            client.close()
        except Exception:
            pass

    # 5. ONLY AFTER successful Hindsight retain: Append to data/analyst_overrides.json
    try:
        overrides: List[Dict[str, Any]] = []
        if DEFAULT_OVERRIDES_PATH.exists():
            with open(DEFAULT_OVERRIDES_PATH, "r", encoding="utf-8") as f:
                overrides = json.load(f)
                if not isinstance(overrides, list):
                    overrides = []

        # Replace any existing override with same live_id or append
        overrides = [o for o in overrides if o.get("alert_id") != live_id]
        overrides.append(live_record)

        temp_file = DEFAULT_OVERRIDES_PATH.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(overrides, f, indent=2, default=str)
        temp_file.replace(DEFAULT_OVERRIDES_PATH)

    except Exception as e:
        logger.error(f"Failed to persist to analyst_overrides.json: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Local persistence failed after Hindsight retention: {str(e)}",
        )

    return {
        "success": True,
        "message": "Memory evolved",
        "live_alert_id": live_id,
        "summary": f"{live_record['title']} confirmed as {verdict} by Priya Nair (demo)",
        "record": live_record,
    }


@app.post("/api/reset-demo")
async def reset_demo() -> Dict[str, Any]:
    """
    Resets ONLY live demo memory.
    1. Collects live IDs from data/analyst_overrides.json.
    2. Clears data/analyst_overrides.json back to [].
    3. Deletes only Hindsight documents ending with '-live' using verified delete_document API.
    Does NOT delete historical memories.
    """
    # 1. Collect live IDs to delete before clearing
    live_ids_to_delete = set()
    if DEFAULT_OVERRIDES_PATH.exists():
        try:
            with open(DEFAULT_OVERRIDES_PATH, "r", encoding="utf-8") as f:
                overrides = json.load(f)
            if isinstance(overrides, list):
                for o in overrides:
                    aid = o.get("alert_id")
                    if aid and aid.endswith("-live"):
                        live_ids_to_delete.add(aid)
        except Exception:
            pass

    # Add default learning pair live id
    live_ids_to_delete.add("ALRT-00602-live")

    # Clear analyst_overrides.json
    try:
        with open(DEFAULT_OVERRIDES_PATH, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)
        local_reset_success = True
    except Exception as e:
        logger.error(f"Failed to reset analyst_overrides.json: {e}")
        local_reset_success = False

    # 2. Hindsight Reset for -live documents
    h_key, bank_id, h_url, _ = load_env_config()
    deleted_docs = []
    hindsight_reset_success = False
    hindsight_msg = ""

    if h_key and bank_id:
        client = Hindsight(base_url=h_url, api_key=h_key)
        try:
            for doc_id in live_ids_to_delete:
                try:
                    resp = await client.documents.delete_document(bank_id=bank_id, document_id=doc_id)
                    if getattr(resp, "success", True):
                        deleted_docs.append(doc_id)
                except Exception as del_err:
                    logger.warning(f"Note on Hindsight delete for {doc_id}: {del_err}")

            hindsight_reset_success = True
            hindsight_msg = f"Deleted {len(deleted_docs)} live document(s) from Hindsight."
        except Exception as e:
            logger.warning(f"Hindsight live-document deletion error: {e}")
            hindsight_msg = f"Hindsight live-document deletion encountered error: {str(e)}"
        finally:
            try:
                client.close()
            except Exception:
                pass
    else:
        hindsight_msg = "Hindsight credentials not configured."

    return {
        "success": local_reset_success,
        "local_reset": local_reset_success,
        "hindsight_reset": hindsight_reset_success,
        "deleted_documents": deleted_docs,
        "message": f"Local demo memory reset. {hindsight_msg}",
    }


@app.post("/api/checks/{alert_id}")
def get_suggested_checks(alert_id: str) -> Dict[str, Any]:
    """
    Generates 4–6 ordered suggested investigation checks using ONE Groq call.
    Grounded ONLY on:
    1. Current alert JSON
    2. Best-match data already available from existing analysis.
    Stores and serves from results/demo_cache.json key: <alert_id>:checks.
    """
    cache = _load_demo_cache()
    cache_key = f"{alert_id}:checks"

    # Serve from cache if available
    if cache_key in cache:
        cached_result = dict(cache[cache_key])
        cached_result["cached"] = True
        return cached_result

    try:
        alert = load_alert(alert_id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")

    # Retrieve existing best-match from memory analysis if cached or run analysis
    mem_cache_key = f"{alert_id}:memory"
    best_match = None
    if mem_cache_key in cache and isinstance(cache[mem_cache_key], dict):
        best_match = cache[mem_cache_key].get("best_match")

    _, _, _, groq_key = load_env_config()
    if not groq_key:
        raise HTTPException(status_code=503, detail="Groq API key not configured.")

    client = groq.Groq(api_key=groq_key)

    prompt = (
        "You are an expert SOC Analyst. Given the following alert and historical comparison data, "
        "provide 4 to 6 concrete, ordered investigation checks that a human analyst should perform first.\n\n"
        "STRICT CONSTRAINTS:\n"
        "- Ground your suggestions ONLY in the provided alert fields and context signals.\n"
        "- Do NOT invent findings, evidence, malware names, or attack entities not present in the data.\n"
        "- Format as actionable verification steps (e.g. 'Verify user authentication logs...', 'Check if destination domain...').\n\n"
        f"CURRENT ALERT:\n{json.dumps(alert, indent=2)}\n\n"
        f"BEST-MATCH HISTORICAL DATA:\n{json.dumps(best_match, indent=2) if best_match else 'None'}\n\n"
        "Return ONLY a valid JSON object with key 'suggested_checks' containing an array of 4-6 strings:\n"
        '{"suggested_checks": ["Check 1", "Check 2", "Check 3", "Check 4"]}'
    )

    try:
        resp = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You provide ordered SOC investigation suggestions in JSON format."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=600,
        )
        content = resp.choices[0].message.content or ""
        
        # Parse JSON
        import re
        content_clean = re.sub(r"<think>[\s\S]*?</think>", "", content).strip()
        match = re.search(r"(\{[\s\S]*\})", content_clean)
        if match:
            parsed = json.loads(match.group(1))
        else:
            parsed = json.loads(content_clean)

        checks = parsed.get("suggested_checks", [])
        if not isinstance(checks, list) or len(checks) < 2:
            raise ValueError("Invalid checks array format returned.")

        result = {
            "alert_id": alert_id,
            "suggested_checks": checks,
            "note": "These are suggestions, not findings.",
            "cached": False,
        }

        # Cache result
        cache[cache_key] = result
        _save_demo_cache(cache)

        return result

    except Exception as e:
        logger.warning(f"Groq suggested checks failed: {e}. Trying fallback model.")
        try:
            resp = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=[
                    {"role": "system", "content": "You provide ordered SOC investigation suggestions in JSON format."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=600,
            )
            content = resp.choices[0].message.content or ""
            import re
            content_clean = re.sub(r"<think>[\s\S]*?</think>", "", content).strip()
            match = re.search(r"(\{[\s\S]*\})", content_clean)
            parsed = json.loads(match.group(1) if match else content_clean)
            checks = parsed.get("suggested_checks", [])

            result = {
                "alert_id": alert_id,
                "suggested_checks": checks,
                "note": "These are suggestions, not findings.",
                "cached": False,
            }
            cache[cache_key] = result
            _save_demo_cache(cache)
            return result
        except Exception as e2:
            logger.error(f"All Groq models failed for suggested checks: {e2}")
            if cache_key in cache:
                cached_result = dict(cache[cache_key])
                cached_result["cached"] = True
                return cached_result
            raise HTTPException(status_code=503, detail="Suggested checks unavailable.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
