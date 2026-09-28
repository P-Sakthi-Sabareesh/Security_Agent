"""
Hindy SOC Memory Agent - FastAPI Backend
Provides REST endpoints to access security alerts, check memory-core health,
and trigger memory-driven / no-memory alert investigations.
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure workspace root is in sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from agent.soc_agent import (
    DEFAULT_ALERTS_PATH,
    SOCMemoryAgent,
    analyze_alert,
    analyze_without_memory,
    load_alert,
    load_env_config,
)

# Configure logging
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
logger = logging.getLogger("hindy_api")

app = FastAPI(
    title="Hindy SOC Memory Agent API",
    description="Backend API for Hindy SOC Memory Agent powered by Hindsight and Groq.",
    version="1.0.0",
)

# Enable CORS for localhost frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RESULTS_DIR = WORKSPACE_ROOT / "results"
DEMO_CACHE_FILE = RESULTS_DIR / "demo_cache.json"


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
    if not DEFAULT_ALERTS_PATH.exists():
        return {}
    try:
        with open(DEFAULT_ALERTS_PATH, "r", encoding="utf-8") as f:
            all_alerts = json.load(f)
        return {
            a["alert_id"]: a
            for a in all_alerts
            if a.get("phase") == "history" and "alert_id" in a
        }
    except Exception:
        return {}


HISTORY_CACHE = _load_historical_metadata_map()


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


@app.get("/api/alerts")
def list_alerts() -> List[Dict[str, Any]]:
    """
    Returns replay alerts only (phase == 'replay').
    Exposes only: id, timestamp, title, severity, host, user, and cached state dot if available.
    Does NOT expose verdict or ground-truth fields.
    """
    if not DEFAULT_ALERTS_PATH.exists():
        raise HTTPException(status_code=404, detail="Alerts dataset not found.")

    with open(DEFAULT_ALERTS_PATH, "r", encoding="utf-8") as f:
        alerts = json.load(f)

    cache = _load_demo_cache()

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
) -> Dict[str, Any]:
    """
    Analyzes an alert using the real SOCMemoryAgent.
    mode=memory: analyze_alert(alert_id)
    mode=nomemory: analyze_without_memory(alert_id)
    
    If cached in results/demo_cache.json, returns cached result with cached=True.
    If live call fails, returns cached result if exists or 503 error.
    """
    try:
        alert = load_alert(alert_id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")

    cache = _load_demo_cache()
    cache_key = f"{alert_id}:{mode}"

    # Check cache first
    if cache_key in cache:
        cached_result = dict(cache[cache_key])
        cached_result["cached"] = True
        return cached_result

    # Run live agent call
    try:
        agent = SOCMemoryAgent()
        try:
            if mode == "nomemory":
                result = agent.analyze_without_memory(alert)
            else:
                result = agent.analyze_alert(alert)
                
                # Enrich recalled cases with historical date/timestamp from real alerts.json lookup
                if "recalled_cases" in result:
                    for c in result["recalled_cases"]:
                        cid = c.get("alert_id")
                        if cid in HISTORY_CACHE:
                            c["timestamp"] = HISTORY_CACHE[cid].get("timestamp")
                            c["day"] = HISTORY_CACHE[cid].get("day")
                            c["mitre_technique"] = HISTORY_CACHE[cid].get("mitre_technique")
                if result.get("best_match") and result["best_match"].get("alert_id") in HISTORY_CACHE:
                    b_id = result["best_match"]["alert_id"]
                    result["best_match"]["timestamp"] = HISTORY_CACHE[b_id].get("timestamp")
                    result["best_match"]["day"] = HISTORY_CACHE[b_id].get("day")

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
