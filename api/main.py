"""
Hindy SOC Memory Agent - FastAPI Backend
Provides REST endpoints to access security alerts, check memory-core health,
trigger memory-driven / no-memory alert investigations, perform live memory retention,
execute reset operations, and generate grounded investigation checks.
"""

import datetime
import hashlib
import json
import logging
import os
import secrets
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

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
REPLAY_CACHE_FILE = RESULTS_DIR / "replay_cache.json"
DATA_ALERTS_PATH = WORKSPACE_ROOT / "data" / "alerts.json"
DATA_OVERRIDES_PATH = WORKSPACE_ROOT / "data" / "analyst_overrides.json"
DATA_USERS_PATH = WORKSPACE_ROOT / "data" / "users.json"
EVALUATION_DIRS = {
    "v1": RESULTS_DIR / "v1" / "eval_summary.json",
    "v2": RESULTS_DIR / "v2" / "eval_summary.json",
    "v2b": RESULTS_DIR / "v2b" / "eval_summary.json",
}

# In-memory Active Session Store (Token -> Session Info)
ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}


class LoginRequest(BaseModel):
    username_or_email: str = Field(..., description="Username or email address")
    password: str = Field(..., description="Password")


class SignupRequest(BaseModel):
    name: str = Field(..., description="Full Name")
    email: str = Field(..., description="Email address")
    username: Optional[str] = Field(None, description="Username")
    password: str = Field(..., description="Password")
    role: Optional[str] = Field("SOC Analyst", description="SOC Role")
    level: Optional[str] = Field("Tier-2 Analyst", description="Analyst Level")


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    level: Optional[str] = None


def _hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000).hex()
    return hashed, salt


def _verify_password(password: str, hashed: str, salt: str) -> bool:
    check_hash, _ = _hash_password(password, salt)
    return secrets.compare_digest(check_hash, hashed)


def _load_users() -> Dict[str, Dict[str, Any]]:
    if not DATA_USERS_PATH.exists():
        h1, s1 = _hash_password("demo")
        h2, s2 = _hash_password("password123")
        default_users = {
            "usr-001": {
                "id": "usr-001",
                "username": "analyst.priya",
                "email": "priya.nair@example.com",
                "name": "Priya Nair",
                "role": "SOC Lead Tier-3",
                "level": "Tier-3 Analyst",
                "password_hash": h1,
                "salt": s1,
                "created_at": "2026-08-01T08:00:00Z",
            },
            "usr-002": {
                "id": "usr-002",
                "username": "analyst.arjun",
                "email": "arjun.rao@example.com",
                "name": "Arjun Rao",
                "role": "SOC Analyst",
                "level": "Tier-2 Analyst",
                "password_hash": h2,
                "salt": s2,
                "created_at": "2026-08-15T09:30:00Z",
            },
        }
        DATA_USERS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(DATA_USERS_PATH, "w", encoding="utf-8") as f:
            json.dump(default_users, f, indent=2)
        return default_users
    try:
        with open(DATA_USERS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load users: {e}")
        return {}


def _save_users(users: Dict[str, Dict[str, Any]]) -> None:
    DATA_USERS_PATH.parent.mkdir(parents=True, exist_ok=True)
    temp_file = DATA_USERS_PATH.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)
    temp_file.replace(DATA_USERS_PATH)


@app.post("/api/auth/login")
def auth_login(req: LoginRequest) -> Dict[str, Any]:
    users = _load_users()
    identifier = req.username_or_email.strip().lower()
    user = None
    for u in users.values():
        if u.get("username", "").lower() == identifier or u.get("email", "").lower() == identifier:
            user = u
            break

    if not user or not _verify_password(req.password, user.get("password_hash", ""), user.get("salt", "")):
        raise HTTPException(status_code=401, detail="Invalid username/email or password.")

    token = secrets.token_hex(24)
    ACTIVE_SESSIONS[token] = {
        "user_id": user["id"],
        "created_at": datetime.datetime.utcnow().isoformat(),
    }

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "username": user.get("username"),
            "role": user.get("role", "SOC Analyst"),
            "level": user.get("level", "Tier-2 Analyst"),
        },
    }


@app.post("/api/auth/signup")
def auth_signup(req: SignupRequest) -> Dict[str, Any]:
    users = _load_users()
    email = req.email.strip().lower()
    username = (req.username or email.split("@")[0]).strip().lower()

    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Full Name is required.")
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters.")

    for u in users.values():
        if u.get("email", "").lower() == email:
            raise HTTPException(status_code=400, detail="An account with this email already exists.")
        if u.get("username", "").lower() == username:
            raise HTTPException(status_code=400, detail="An account with this username already exists.")

    uid = f"usr-{secrets.token_hex(4)}"
    pw_hash, salt = _hash_password(req.password)

    new_user = {
        "id": uid,
        "name": req.name.strip(),
        "email": email,
        "username": username,
        "role": req.role or "SOC Analyst",
        "level": req.level or "Tier-2 Analyst",
        "password_hash": pw_hash,
        "salt": salt,
        "created_at": datetime.datetime.utcnow().isoformat(),
    }

    users[uid] = new_user
    _save_users(users)

    token = secrets.token_hex(24)
    ACTIVE_SESSIONS[token] = {
        "user_id": uid,
        "created_at": datetime.datetime.utcnow().isoformat(),
    }

    return {
        "success": True,
        "token": token,
        "user": {
            "id": new_user["id"],
            "name": new_user["name"],
            "email": new_user["email"],
            "username": new_user["username"],
            "role": new_user["role"],
            "level": new_user["level"],
        },
    }


@app.get("/api/auth/me")
def auth_me(token: Optional[str] = Query(None)) -> Dict[str, Any]:
    if not token or token not in ACTIVE_SESSIONS:
        raise HTTPException(status_code=401, detail="Session expired or invalid.")
    user_id = ACTIVE_SESSIONS[token]["user_id"]
    users = _load_users()
    user = users.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "username": user.get("username"),
        "role": user.get("role", "SOC Analyst"),
        "level": user.get("level", "Tier-2 Analyst"),
    }


@app.put("/api/auth/profile")
def auth_update_profile(req: UpdateProfileRequest, token: Optional[str] = Query(None)) -> Dict[str, Any]:
    if not token or token not in ACTIVE_SESSIONS:
        raise HTTPException(status_code=401, detail="Session expired or invalid.")
    user_id = ACTIVE_SESSIONS[token]["user_id"]
    users = _load_users()
    user = users.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if req.name and req.name.strip():
        user["name"] = req.name.strip()
    if req.email and req.email.strip() and "@" in req.email:
        user["email"] = req.email.strip().lower()
    if req.role and req.role.strip():
        user["role"] = req.role.strip()
    if req.level and req.level.strip():
        user["level"] = req.level.strip()

    users[user_id] = user
    _save_users(users)

    return {
        "success": True,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "username": user.get("username"),
            "role": user.get("role", "SOC Analyst"),
            "level": user.get("level", "Tier-2 Analyst"),
        },
    }


@app.post("/api/auth/logout")
def auth_logout(token: Optional[str] = Query(None)) -> Dict[str, Any]:
    if token and token in ACTIVE_SESSIONS:
        del ACTIVE_SESSIONS[token]
    return {"success": True, "message": "Logged out successfully."}


def _load_demo_cache() -> Dict[str, Any]:
    """Loads cache from disk."""
    if not DEMO_CACHE_FILE.exists():
        return {}
    try:
        with open(DEMO_CACHE_FILE, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception as e:
        logger.warning(f"Failed to read demo cache: {e}")
        return {}


def _load_json_file(path: Path) -> Any:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _load_recorded_analysis(alert_id: str, mode: str, demo_cache: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Find a saved analysis without constructing an agent or contacting a provider."""
    cached = demo_cache.get(f"{alert_id}:{mode}")
    if isinstance(cached, dict):
        return cached
    if mode != "memory" or not REPLAY_CACHE_FILE.exists():
        return None
    try:
        replay_cache = _load_json_file(REPLAY_CACHE_FILE)
        for entry in replay_cache.get("entries", []):
            if entry.get("alert_id") == alert_id and isinstance(entry.get("analysis"), dict):
                return entry["analysis"]
    except Exception as e:
        logger.warning(f"Could not load recorded replay analysis for {alert_id}: {e}")
    return None


def _save_demo_cache(cache_data: Dict[str, Any]) -> None:
    """Atomically saves cache to disk."""
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    temp_file = DEMO_CACHE_FILE.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(cache_data, f, indent=2, default=str)
    temp_file.replace(DEMO_CACHE_FILE)


def _invalidate_live_memory_cache(
    live_document_ids: Set[str],
    invalidate_any_live_document: bool = False,
) -> None:
    """Remove cached analyses that contain a live document being reset or replaced."""
    if not live_document_ids and not invalidate_any_live_document:
        return

    cache = _load_demo_cache()
    changed = False
    for cache_key, result in list(cache.items()):
        if not cache_key.endswith(":memory") or not isinstance(result, dict):
            continue
        recalled_ids = {
            case.get("alert_id")
            for case in result.get("recalled_cases", [])
            if isinstance(case, dict)
        }
        best_match = result.get("best_match")
        if isinstance(best_match, dict):
            recalled_ids.add(best_match.get("alert_id"))
        has_live_recall = any(
            isinstance(alert_id, str) and alert_id.endswith("-live")
            for alert_id in recalled_ids
        )
        if recalled_ids.intersection(live_document_ids) or (invalidate_any_live_document and has_live_recall):
            del cache[cache_key]
            changed = True

    if changed:
        _save_demo_cache(cache)


def _load_historical_metadata_map() -> Dict[str, Dict[str, Any]]:
    """Loads history alerts to supply timestamp/date for recalled memory cards."""
    history_map = {}
    if DATA_ALERTS_PATH.exists():
        try:
            with open(DATA_ALERTS_PATH, "r", encoding="utf-8") as f:
                all_alerts = json.load(f)
            for a in all_alerts:
                if a.get("phase") == "history" and "alert_id" in a:
                    history_map[a["alert_id"]] = a
        except Exception:
            pass

    if DATA_OVERRIDES_PATH.exists():
        try:
            with open(DATA_OVERRIDES_PATH, "r", encoding="utf-8") as f:
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
    if not DATA_OVERRIDES_PATH.exists():
        return set()
    try:
        with open(DATA_OVERRIDES_PATH, "r", encoding="utf-8") as f:
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


@app.get("/api/replay-cache")
def get_replay_cache() -> Dict[str, Any]:
    """Returns only previously recorded replay outputs; it does not run the agent."""
    if not REPLAY_CACHE_FILE.exists():
        raise HTTPException(status_code=404, detail="Run scripts/build_replay_cache.py first.")
    try:
        data = _load_json_file(REPLAY_CACHE_FILE)
        # Enrich entries with alert telemetry if available in alerts.json
        if DATA_ALERTS_PATH.exists():
            try:
                with open(DATA_ALERTS_PATH, "r", encoding="utf-8") as f:
                    all_alerts = {a.get("alert_id"): a for a in json.load(f) if isinstance(a, dict) and "alert_id" in a}
                for entry in data.get("entries", []):
                    aid = entry.get("alert_id")
                    if aid in all_alerts:
                        alrt = all_alerts[aid]
                        entry["host"] = alrt.get("host") or entry.get("host")
                        entry["user"] = alrt.get("user") or entry.get("user")
                        entry["severity"] = alrt.get("severity") or entry.get("severity")
                        entry["category"] = alrt.get("category") or entry.get("category")
                        entry["detector_id"] = alrt.get("detector_id")
                        entry["mitre_technique"] = alrt.get("mitre_technique")
                        entry["details"] = alrt.get("details", {})
                        entry["context"] = alrt.get("context", {})
            except Exception as enrich_err:
                logger.warning(f"Could not enrich replay entries: {enrich_err}")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read replay cache: {e}")


@app.get("/api/evaluation")
def get_evaluation(version: str = Query("v2", pattern="^(v1|v2|v2b)$")) -> Dict[str, Any]:
    """Returns a saved evaluation summary exactly as recorded, without recomputation."""
    evaluation_file = EVALUATION_DIRS[version]
    if not evaluation_file.exists():
        raise HTTPException(status_code=404, detail="Run scripts/evaluate.py first.")
    try:
        return _load_json_file(evaluation_file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read evaluation summary: {e}")


@app.get("/api/evaluation/alerts")
def get_evaluation_alerts(version: str = Query("v2", pattern="^(v1|v2|v2b)$")) -> List[Dict[str, Any]]:
    """
    Returns the per-alert evaluation comparison between with_memory and without_memory.
    Enriched with alert telemetry (title, category, severity, host, user, details, context).
    Does NOT read or expose ground_truth.json.
    """
    mem_file = RESULTS_DIR / version / "eval_memory.json"
    nomem_file = RESULTS_DIR / version / "eval_nomemory.json"
    if not mem_file.exists() or not nomem_file.exists():
        mem_file = RESULTS_DIR / "eval_memory.json"
        nomem_file = RESULTS_DIR / "eval_nomemory.json"

    if not mem_file.exists() or not nomem_file.exists():
        raise HTTPException(status_code=404, detail="Evaluation alert records not found.")

    mem_data = _load_json_file(mem_file)
    nomem_data = _load_json_file(nomem_file)

    # Load alert metadata from alerts.json (telemetry only)
    alerts_map = {}
    if DATA_ALERTS_PATH.exists():
        try:
            with open(DATA_ALERTS_PATH, "r", encoding="utf-8") as f:
                alerts_map = {a.get("alert_id"): a for a in json.load(f) if isinstance(a, dict) and "alert_id" in a}
        except Exception as e:
            logger.warning(f"Could not load alerts map: {e}")

    results = []
    # Preserve sample ordering if sample_ids exists
    sample_ids = []
    sample_ids_file = RESULTS_DIR / "sample_ids.json"
    if sample_ids_file.exists():
        try:
            sample_ids = _load_json_file(sample_ids_file).get("sample_ids", [])
        except Exception:
            pass
    if not sample_ids:
        sample_ids = list(mem_data.keys())

    for aid in sample_ids:
        mem_res = mem_data.get(aid, {})
        nomem_res = nomem_data.get(aid, {})
        alrt = alerts_map.get(aid, {})

        mem_state = str(mem_res.get("state", "unknown")).upper()
        nomem_state = str(nomem_res.get("state", "unknown")).upper()

        # Derive neutral comparison impact
        if mem_state != nomem_state:
            impact_category = "changed_decision"
            impact_label = f"Decision changed: {nomem_state} → {mem_state}"
        elif mem_res.get("recalled_cases") and len(mem_res.get("recalled_cases", [])) > 0:
            impact_category = "context_enriched"
            impact_label = "Context enriched with past memory"
        else:
            impact_category = "no_change"
            impact_label = "No decision change"

        results.append({
            "alert_id": aid,
            "title": alrt.get("title") or mem_res.get("title") or aid,
            "category": alrt.get("category") or "Security Alert",
            "scenario": alrt.get("scenario") or "General",
            "severity": alrt.get("severity") or "Medium",
            "host": alrt.get("host") or "N/A",
            "user": alrt.get("user") or "N/A",
            "timestamp": alrt.get("timestamp"),
            "details": alrt.get("details", {}),
            "context": alrt.get("context", {}),
            "with_memory": {
                "state": mem_res.get("state"),
                "elapsed_seconds": mem_res.get("elapsed_seconds"),
                "recalled_cases": mem_res.get("recalled_cases", []),
                "best_match": mem_res.get("best_match"),
                "explanation": mem_res.get("explanation"),
                "reasons": mem_res.get("reasons", []),
                "recommended_action": mem_res.get("recommended_action"),
            },
            "without_memory": {
                "state": nomem_res.get("state"),
                "elapsed_seconds": nomem_res.get("elapsed_seconds"),
                "explanation": nomem_res.get("explanation"),
                "reasons": nomem_res.get("reasons", []),
                "recommended_action": nomem_res.get("recommended_action"),
            },
            "impact_category": impact_category,
            "impact_label": impact_label,
        })

    return results


@app.get("/api/alerts")
def list_alerts() -> List[Dict[str, Any]]:
    """
    Returns replay alerts only (phase == 'replay').
    Exposes only: id, timestamp, title, severity, host, user, cached_state, is_learning_pair, is_decided.
    Does NOT expose verdict or ground-truth fields.
    """
    if not DATA_ALERTS_PATH.exists():
        raise HTTPException(status_code=404, detail="Alerts dataset not found.")

    with open(DATA_ALERTS_PATH, "r", encoding="utf-8") as f:
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


def _load_recalled_memory_usage_map() -> Dict[str, List[str]]:
    """Maps historical memory IDs to list of replay alert IDs that recalled them."""
    usage: Dict[str, Set[str]] = {}
    
    # 1. From demo_cache
    demo_cache = _load_demo_cache()
    for key, val in demo_cache.items():
        if key.endswith(":memory") and isinstance(val, dict):
            alert_id = key.split(":")[0]
            for case in val.get("recalled_cases", []):
                if isinstance(case, dict) and "alert_id" in case:
                    usage.setdefault(case["alert_id"], set()).add(alert_id)
            if isinstance(val.get("best_match"), dict) and "alert_id" in val["best_match"]:
                usage.setdefault(val["best_match"]["alert_id"], set()).add(alert_id)

    # 2. From replay_cache
    if REPLAY_CACHE_FILE.exists():
        try:
            replay_cache = _load_json_file(REPLAY_CACHE_FILE)
            for entry in replay_cache.get("entries", []):
                alert_id = entry.get("alert_id")
                if not alert_id:
                    continue
                for case_id in entry.get("recalled_case_ids", []):
                    if isinstance(case_id, str):
                        usage.setdefault(case_id, set()).add(alert_id)
                if entry.get("best_match_id"):
                    usage.setdefault(entry["best_match_id"], set()).add(alert_id)
        except Exception:
            pass

    return {k: sorted(list(v)) for k, v in usage.items()}


@app.get("/api/memories")
def list_memories(
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    verdict: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """
    Returns real historical security experience memories loaded into Hindsight bank,
    including live analyst overrides and relationships to active investigations.
    """
    memories_map: Dict[str, Dict[str, Any]] = {}

    # Load historical memories from alerts.json
    if DATA_ALERTS_PATH.exists():
        try:
            with open(DATA_ALERTS_PATH, "r", encoding="utf-8") as f:
                alerts_data = json.load(f)
            for a in alerts_data:
                if a.get("phase") == "history" and "alert_id" in a:
                    memories_map[a["alert_id"]] = {
                        "id": a["alert_id"],
                        "timestamp": a.get("timestamp"),
                        "day": a.get("day"),
                        "title": a.get("title", "Security Event"),
                        "category": a.get("category", "General"),
                        "severity": a.get("severity", "Medium"),
                        "mitre_technique": a.get("mitre_technique"),
                        "detector_id": a.get("detector_id"),
                        "user": a.get("user", ""),
                        "host": a.get("host", ""),
                        "src_ip": a.get("src_ip"),
                        "dst": a.get("dst"),
                        "details": a.get("details", {}),
                        "context": a.get("context", {}),
                        "analyst": a.get("analyst", "SOC Analyst"),
                        "investigation_note": a.get("investigation_note", ""),
                        "verdict": a.get("verdict", "BenignPositive"),
                        "outcome": a.get("outcome", ""),
                        "is_live": False,
                    }
        except Exception as e:
            logger.warning(f"Failed to load historical alerts: {e}")

    # Load live overrides from analyst_overrides.json (these are live retained memories)
    if DATA_OVERRIDES_PATH.exists():
        try:
            with open(DATA_OVERRIDES_PATH, "r", encoding="utf-8") as f:
                overrides_data = json.load(f)
            if isinstance(overrides_data, list):
                for a in overrides_data:
                    if "alert_id" in a:
                        memories_map[a["alert_id"]] = {
                            "id": a["alert_id"],
                            "timestamp": a.get("timestamp"),
                            "day": a.get("day"),
                            "title": a.get("title", "Security Event"),
                            "category": a.get("category", "General"),
                            "severity": a.get("severity", "Medium"),
                            "mitre_technique": a.get("mitre_technique"),
                            "detector_id": a.get("detector_id"),
                            "user": a.get("user", ""),
                            "host": a.get("host", ""),
                            "src_ip": a.get("src_ip"),
                            "dst": a.get("dst"),
                            "details": a.get("details", {}),
                            "context": a.get("context", {}),
                            "analyst": a.get("analyst", "Priya Nair (demo)"),
                            "investigation_note": a.get("investigation_note", ""),
                            "verdict": a.get("verdict", "BenignPositive"),
                            "outcome": a.get("outcome", ""),
                            "is_live": True,
                        }
        except Exception as e:
            logger.warning(f"Failed to load analyst overrides: {e}")

    usage_map = _load_recalled_memory_usage_map()

    all_memories = list(memories_map.values())

    # Attach related investigations to each memory
    for m in all_memories:
        m["related_investigations"] = usage_map.get(m["id"], [])

    # Calculate real derived statistics (no fake data)
    total_count = len(all_memories)
    attack_count = sum(1 for m in all_memories if m["verdict"] in ["TruePositive", "Malicious"])
    benign_count = sum(1 for m in all_memories if m["verdict"] in ["BenignPositive", "Benign"])
    live_count = sum(1 for m in all_memories if m.get("is_live"))

    categories_count: Dict[str, int] = {}
    for m in all_memories:
        cat = m.get("category") or "Uncategorized"
        categories_count[cat] = categories_count.get(cat, 0) + 1

    # Filter
    filtered = all_memories
    if category and category.lower() != "all":
        filtered = [m for m in filtered if str(m.get("category", "")).lower() == category.lower()]

    if verdict and verdict.lower() != "all":
        if verdict.lower() == "attack":
            filtered = [m for m in filtered if m["verdict"] in ["TruePositive", "Malicious"]]
        elif verdict.lower() == "benign":
            filtered = [m for m in filtered if m["verdict"] in ["BenignPositive", "Benign"]]
        elif verdict.lower() == "live":
            filtered = [m for m in filtered if m.get("is_live")]

    if severity and severity.lower() != "all":
        filtered = [m for m in filtered if str(m.get("severity", "")).lower() == severity.lower()]

    if q and q.strip():
        query_str = q.strip().lower()
        filtered = [
            m for m in filtered
            if query_str in m.get("id", "").lower()
            or query_str in m.get("title", "").lower()
            or query_str in m.get("host", "").lower()
            or query_str in m.get("user", "").lower()
            or query_str in m.get("analyst", "").lower()
            or query_str in m.get("investigation_note", "").lower()
            or query_str in m.get("category", "").lower()
            or query_str in str(m.get("details", "")).lower()
            or query_str in str(m.get("context", "")).lower()
        ]

    # Sort: Live overrides first, then by timestamp descending, then ID descending
    def sort_key(m: Dict[str, Any]):
        is_live = 1 if m.get("is_live") else 0
        ts = str(m.get("timestamp") or "")
        return (is_live, ts, m.get("id", ""))

    filtered.sort(key=sort_key, reverse=True)

    return {
        "stats": {
            "total_memories": total_count,
            "attack_count": attack_count,
            "benign_count": benign_count,
            "live_count": live_count,
            "categories": [{"category": k, "count": v} for k, v in sorted(categories_count.items(), key=lambda x: -x[1])],
        },
        "memories": filtered,
    }


@app.get("/api/memories/{memory_id}")
def get_memory_detail(memory_id: str) -> Dict[str, Any]:
    """Returns full retained experience details for a single memory unit."""
    # Check overrides first
    if DATA_OVERRIDES_PATH.exists():
        try:
            with open(DATA_OVERRIDES_PATH, "r", encoding="utf-8") as f:
                overrides_data = json.load(f)
            if isinstance(overrides_data, list):
                for a in overrides_data:
                    if a.get("alert_id") == memory_id:
                        usage_map = _load_recalled_memory_usage_map()
                        record = dict(a)
                        record["id"] = a["alert_id"]
                        record["is_live"] = True
                        record["related_investigations"] = usage_map.get(memory_id, [])
                        return record
        except Exception:
            pass

    # Check alerts.json
    if DATA_ALERTS_PATH.exists():
        try:
            with open(DATA_ALERTS_PATH, "r", encoding="utf-8") as f:
                alerts_data = json.load(f)
            for a in alerts_data:
                if a.get("alert_id") == memory_id and a.get("phase") == "history":
                    usage_map = _load_recalled_memory_usage_map()
                    record = dict(a)
                    record["id"] = a["alert_id"]
                    record["is_live"] = False
                    record["related_investigations"] = usage_map.get(memory_id, [])
                    return record
        except Exception:
            pass

    raise HTTPException(status_code=404, detail=f"Memory unit '{memory_id}' not found.")


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


@app.get("/api/who-knows/{alert_id}")
def get_who_knows(alert_id: str) -> Dict[str, Any]:
    """Counts analysts on history records with the same title and host as a replay alert."""
    try:
        current_alert = load_alert(alert_id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")

    history_records: List[Dict[str, Any]] = []
    for source_path in (DATA_ALERTS_PATH, DATA_OVERRIDES_PATH):
        if not source_path.exists():
            continue
        try:
            records = _load_json_file(source_path)
            if isinstance(records, list):
                history_records.extend(record for record in records if isinstance(record, dict))
        except Exception as e:
            logger.warning(f"Could not load history source {source_path}: {e}")

    analyst_cases: Dict[str, List[Dict[str, Any]]] = {}
    for record in history_records:
        if (
            record.get("phase") == "history"
            and record.get("title") == current_alert.get("title")
            and record.get("host") == current_alert.get("host")
            and record.get("analyst")
        ):
            analyst_cases.setdefault(str(record["analyst"]), []).append(record)

    analysts = [
        {
            "analyst": analyst,
            "count": len(cases),
            "last_case_date": max(str(case.get("timestamp", "")) for case in cases),
        }
        for analyst, cases in analyst_cases.items()
    ]
    analysts.sort(key=lambda item: (-item["count"], item["last_case_date"], item["analyst"]))
    return {"alert_id": alert_id, "analysts": analysts}


@app.get("/api/incident-summary/{alert_id}")
def get_incident_summary(alert_id: str) -> Dict[str, Any]:
    """Builds a copy-ready draft from recorded alert analysis without an LLM call."""
    try:
        alert = load_alert(alert_id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")

    cache = _load_demo_cache()
    analysis = cache.get(f"{alert_id}:memory")
    if not isinstance(analysis, dict):
        raise HTTPException(status_code=409, detail="Analyze this alert before generating an incident summary.")

    state = str(analysis.get("state", "")).upper()
    if state not in {"YELLOW", "RED"}:
        raise HTTPException(status_code=409, detail="Incident summaries are available for YELLOW and RED alerts only.")

    best_match = analysis.get("best_match") if isinstance(analysis.get("best_match"), dict) else None
    differences = best_match.get("differences", []) if best_match else []
    checks = cache.get(f"{alert_id}:checks", {})
    check_list = checks.get("suggested_checks", []) if isinstance(checks, dict) else []
    if best_match:
        match_text = (
            f"Best-match case: {best_match.get('alert_id', 'not recorded')} | "
            f"Analyst: {best_match.get('analyst', 'not recorded')} | "
            f"Verdict: {best_match.get('verdict', 'not recorded')} | "
            f"Outcome: {best_match.get('outcome', 'not recorded')}"
        )
        if best_match.get("key_difference_count", 0) == 0:
            memory_note = "Memory applies: no key contextual differences were recorded."
        else:
            memory_note = "Memory does not apply because key contextual differences were recorded."
    else:
        match_text = "Best-match case: no recalled historical case."
        memory_note = "Memory does not apply because no historical case was recalled."

    difference_lines = [
        f"- {item.get('signal')}: {item.get('past')} -> {item.get('current')}"
        for item in differences if isinstance(item, dict)
    ] or ["- No differing signals were recorded."]
    check_lines = [f"- {check}" for check in check_list] or ["- Suggested checks were not generated."]
    summary = "\n".join([
        "INCIDENT SUMMARY (DRAFT)",
        f"Alert: {alert.get('alert_id')} — {alert.get('title')}",
        f"Risk state: {state}",
        match_text,
        "Differing signals:",
        *difference_lines,
        memory_note,
        "Suggested checks:",
        *check_lines,
        "Draft only. No ticket was created in any external system.",
    ])
    return {"alert_id": alert_id, "state": state.lower(), "summary": summary}


@app.post("/api/analyze/{alert_id}")
def analyze_alert_endpoint(
    alert_id: str,
    mode: str = Query("memory", regex="^(memory|nomemory)$"),
    bypass_cache: bool = Query(False),
    allow_cached_fallback: bool = Query(True),
    cached_only: bool = Query(False),
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
    recorded_result = _load_recorded_analysis(alert_id, mode, cache)

    if cached_only:
        if recorded_result is not None:
            cached_result = dict(recorded_result)
            cached_result["cached"] = True
            return cached_result
        raise HTTPException(status_code=404, detail="Not recorded in demo cache.")

    # Check cache first if not explicitly bypassed
    if not bypass_cache and recorded_result is not None:
        cached_result = dict(recorded_result)
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
        if allow_cached_fallback and recorded_result is not None:
            cached_result = dict(recorded_result)
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
def submit_decision(req: DecisionRequest, cached_only: bool = Query(False)) -> Dict[str, Any]:
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
    if cached_only:
        raise HTTPException(status_code=409, detail="Cached-only demo mode cannot retain analyst decisions.")

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
        raise HTTPException(status_code=503, detail="Hindsight credentials not configured in .env.")

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
            f"verdict:{verdict}",
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

    _invalidate_live_memory_cache({live_id})

    return {
        "success": True,
        "message": "Memory evolved",
        "live_alert_id": live_id,
        "summary": f"{live_record['title']} confirmed as {verdict} by Priya Nair (demo)",
        "record": live_record,
    }


@app.post("/api/reset-demo")
def reset_demo(cached_only: bool = Query(False)) -> Dict[str, Any]:
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

    # Clear analyst_overrides.json only after collecting its live document IDs.
    try:
        temp_file = DEFAULT_OVERRIDES_PATH.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)
        temp_file.replace(DEFAULT_OVERRIDES_PATH)
        local_reset_success = True
    except Exception as e:
        logger.error(f"Failed to reset analyst_overrides.json: {e}")
        local_reset_success = False

    # 2. Hindsight Reset for -live documents
    h_key, bank_id, h_url, _ = load_env_config()
    deleted_docs = []
    hindsight_reset_success: Optional[bool] = None
    hindsight_msg = ""

    if cached_only:
        hindsight_msg = "Hindsight live-memory deletion skipped in cached-only demo mode."
    elif h_key and bank_id:
        client = Hindsight(base_url=h_url, api_key=h_key)
        try:
            # Discover only documents written by this decision flow, then keep the
            # documented live-ID boundary as a second safeguard before deletion.
            offset = 0
            while True:
                document_page = client.documents.list_documents(
                    bank_id=bank_id,
                    q="-live",
                    tags=["source:live-override"],
                    tags_match="all",
                    limit=100,
                    offset=offset,
                )
                for document in document_page.items:
                    if document.id.endswith("-live"):
                        live_ids_to_delete.add(document.id)
                offset += len(document_page.items)
                if offset >= document_page.total or not document_page.items:
                    break

            for doc_id in sorted(live_ids_to_delete):
                try:
                    resp = client.documents.delete_document(bank_id=bank_id, document_id=doc_id)
                    if resp.success:
                        deleted_docs.append(doc_id)
                    else:
                        raise RuntimeError(f"Hindsight returned success=False for {doc_id}.")
                except Exception as del_err:
                    logger.warning(f"Hindsight delete failed for {doc_id}: {del_err}")
                    raise

            hindsight_reset_success = True
            hindsight_msg = (
                f"Deleted {len(deleted_docs)} live document(s) from Hindsight."
                if live_ids_to_delete
                else "No local live documents required Hindsight deletion."
            )
        except Exception as e:
            hindsight_reset_success = False
            logger.warning(f"Hindsight live-document deletion error: {e}")
            hindsight_msg = f"Hindsight live-document deletion failed: {str(e)}"
        finally:
            try:
                client.close()
            except Exception:
                pass
    else:
        hindsight_msg = "Hindsight live-memory deletion skipped because credentials are not configured."

    _invalidate_live_memory_cache(live_ids_to_delete, invalidate_any_live_document=True)

    return {
        "success": local_reset_success,
        "local_reset": local_reset_success,
        "hindsight_reset": hindsight_reset_success,
        "deleted_documents": deleted_docs,
        "message": f"Local demo memory reset. {hindsight_msg}",
    }


@app.post("/api/checks/{alert_id}")
def get_suggested_checks(alert_id: str, cached_only: bool = Query(False)) -> Dict[str, Any]:
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

    if cached_only:
        raise HTTPException(status_code=404, detail="Not recorded in demo cache.")

    try:
        alert = load_alert(alert_id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")

    # Use only the best match produced by an existing memory analysis. This endpoint
    # never performs a second Hindsight recall.
    mem_cache_key = f"{alert_id}:memory"
    memory_analysis = cache.get(mem_cache_key)
    if not isinstance(memory_analysis, dict):
        raise HTTPException(
            status_code=409,
            detail="Analyze this alert with Hindy before requesting suggested checks.",
        )
    best_match = memory_analysis.get("best_match")

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
        if not isinstance(checks, list) or not 4 <= len(checks) <= 6 or not all(isinstance(item, str) for item in checks):
            raise ValueError("Expected an array of 4 to 6 suggested checks.")

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
        logger.error(f"Suggested checks generation failed for {alert_id}: {e}")
        if cache_key in cache:
            cached_result = dict(cache[cache_key])
            cached_result["cached"] = True
            return cached_result
        raise HTTPException(status_code=503, detail="Suggested checks unavailable.")
    finally:
        client.close()


class ChatMessageItem(BaseModel):
    role: str  # 'user' | 'assistant'
    content: str


class InvestigationChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessageItem]] = Field(default_factory=list)


@app.post("/api/chat/{alert_id}")
def chat_investigation(alert_id: str, req: InvestigationChatRequest) -> Dict[str, Any]:
    """
    Alert-specific Hindy investigation chat endpoint.
    Grounded exclusively on:
    1. Current alert telemetry and environment context.
    2. Hindy memory analysis, reasoning pathway, and retrieved historical precedents.
    3. Rejects off-topic inquiries with a polite refocus notice.
    4. Explicitly avoids hallucination when data is absent.
    """
    try:
        alert = load_alert(alert_id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")

    cache = _load_demo_cache()
    mem_key = f"{alert_id}:memory"
    memory_analysis = cache.get(mem_key)

    # If not in demo_cache, check replay_cache or generate live
    if not memory_analysis and REPLAY_CACHE_FILE.exists():
        try:
            replay_cache = _load_json_file(REPLAY_CACHE_FILE)
            for entry in replay_cache.get("entries", []):
                if entry.get("alert_id") == alert_id and isinstance(entry.get("analysis"), dict):
                    memory_analysis = entry["analysis"]
                    break
        except Exception:
            pass

    _, _, _, groq_key = load_env_config()
    if not groq_key:
        raise HTTPException(status_code=503, detail="Groq API key not configured in .env.")

    # Auto-generate analysis if not present in cache
    if not memory_analysis:
        try:
            h_key, bank_id, h_url, _ = load_env_config()
            if h_key and bank_id:
                agent = SOCMemoryAgent(
                    hindsight_api_key=h_key,
                    hindsight_bank_id=bank_id,
                    hindsight_base_url=h_url,
                    groq_api_key=groq_key,
                )
                memory_analysis = agent.analyze_alert(alert_id)
                cache[mem_key] = memory_analysis
                _save_demo_cache(cache)
        except Exception as e:
            logger.warning(f"Could not auto-run analysis for chat: {e}")

    client = groq.Groq(api_key=groq_key)

    # Format a high-density, compact context dictionary to stay well within Groq token limits (~1,200 tokens)
    compact_current_alert = {
        "alert_id": alert.get("alert_id"),
        "title": alert.get("title"),
        "category": alert.get("category"),
        "severity": alert.get("severity"),
        "host": alert.get("host"),
        "user": alert.get("user"),
        "timestamp": alert.get("timestamp"),
        "detector_id": alert.get("detector_id"),
        "mitre_technique": alert.get("mitre_technique"),
        "details": alert.get("details"),
        "context": alert.get("context"),
    }

    compact_memory = {}
    if isinstance(memory_analysis, dict):
        compact_memory = {
            "state": memory_analysis.get("state"),
            "recommended_action": memory_analysis.get("recommended_action"),
            "explanation": memory_analysis.get("explanation"),
            "safety_overrides": memory_analysis.get("safety_overrides", []),
            "reasons": memory_analysis.get("reasons", []),
            "best_match": memory_analysis.get("best_match"),
            "recalled_precedents": [
                {
                    "alert_id": c.get("alert_id"),
                    "title": c.get("title"),
                    "verdict": c.get("verdict"),
                    "outcome": c.get("outcome"),
                    "investigation_note": c.get("investigation_note"),
                    "matches": c.get("matches", []),
                    "differences": c.get("differences", []),
                }
                for c in memory_analysis.get("recalled_cases", [])[:4]
                if isinstance(c, dict)
            ],
        }

    context_str = json.dumps({
        "current_alert": compact_current_alert,
        "hindy_assessment_and_memory": compact_memory,
    }, indent=2, default=str)

    system_prompt = (
        f"You are Hindy, an expert SOC AI Memory & Reasoning Assistant. You are pairing with an SOC Analyst to investigate alert '{alert_id}'.\n\n"
        "STRICT GROUNDING & BEHAVIOR RULES:\n"
        "1. GROUNDING: Answer questions ONLY using the provided Current Alert Telemetry and Hindy Memory Analysis (recalled precedents, matches, differences, reasoning).\n"
        "2. NO HALLUCINATION: Never fabricate historical cases, hostnames, usernames, IPs, attack vectors, or evidence. If the requested information is not in the context, state: \"I don't have enough evidence in this investigation to confirm that.\"\n"
        "3. OFF-TOPIC QUESTIONS: If the analyst asks unrelated general questions (e.g., general trivia, world facts, writing general non-security code, jokes), politely redirect: \"I’m focused on this security investigation. Ask me about this alert or its related evidence.\"\n"
        "4. ADVISORY NATURE: Hindy's assessment is advisory. The human SOC Analyst holds final authority for decisions.\n"
        "5. TONE & LENGTH: Be concise, direct, professional, and clear for a security analyst. Use clean formatting.\n\n"
        f"INVESTIGATION CONTEXT FOR {alert_id}:\n{context_str}"
    )

    messages = [{"role": "system", "content": system_prompt}]
    
    # Add recent history (up to last 8 turns)
    if req.history:
        for msg in req.history[-8:]:
            role = "assistant" if msg.role == "assistant" else "user"
            messages.append({"role": role, "content": msg.content})

    # Add current question
    messages.append({"role": "user", "content": req.message})

    try:
        models_to_try = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]
        response_content = None

        for model_name in models_to_try:
            try:
                resp = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=0.15,
                    max_tokens=500,
                )
                response_content = resp.choices[0].message.content or ""
                break
            except Exception as model_err:
                logger.warning(f"Chat model {model_name} failed: {model_err}")
                continue

        if not response_content:
            raise RuntimeError("All LLM models failed to produce a response.")

        # Clean think tags if any
        import re
        cleaned_content = re.sub(r"<think>[\s\S]*?</think>", "", response_content).strip()

        return {
            "alert_id": alert_id,
            "response": cleaned_content,
            "success": True,
        }

    except Exception as e:
        logger.error(f"Investigation chat failed for {alert_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Hindy can't access the investigation context right now.",
        )
    finally:
        client.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

