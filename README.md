# Hindy — Experience-Driven SOC Memory Agent

> *"Remembers everything. Verifies before trusting."*

Hindy is an experience-driven Security Operations Center (SOC) investigation assistant. It combines long-term episodic memory via **Hindsight Cloud** with deep analytical reasoning via **Groq LLM** to analyze incoming security alerts against historical analyst decisions, investigations, and context signals.

---

## 1. Project Overview

Modern SOC teams face severe alert fatigue and repetitive triage. When an alert arrives, Hindy:
1. **Recalls** relevant historical alert resolutions and senior analyst notes from the Hindsight memory bank.
2. **Performs deterministic context verification**, comparing categorical and boolean environment signals (user role, destination host, subnet, device trust, authentication flags).
3. **Identifies critical signal deviations** (e.g., lookalike domains, privilege mismatches, off-hours anomaly) before trusting past benign outcomes.
4. **Synthesizes transparent reasoning** without automated closure or fabricated confidence percentages.

---

## 2. Requirements

- **Python**: 3.10+
- **Node.js**: 18+ and `npm`
- **Hindsight Cloud** account with API credentials
- **Groq Cloud** API key for fast inference

---

## 3. Environment Variables

Create a `.env` file in the project root with your credentials:

```env
# Hindsight Cloud Configuration
HINDSIGHT_API_KEY=your_hindsight_api_key_here
HINDSIGHT_BANK_ID=your_hindsight_bank_id_here

# Groq Cloud Configuration
GROQ_API_KEY=your_groq_api_key_here
```

> **Security Guarantee**: All API keys and authentication tokens are strictly backend-only. The FastAPI server acts as a secure boundary and never exposes any secret or credential to the browser client or frontend bundle.

---

## 4. How to Run the Backend (FastAPI)

From the project root:

```bash
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at `http://127.0.0.1:8000`.

---

## 5. How to Run the Frontend (React + Vite + TypeScript + Tailwind CSS)

From the project root:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://127.0.0.1:5173`.

---

## 6. Cache Warming Script

To pre-compute and store cached analysis results for key demonstration alerts (`ALRT-00661`, `ALRT-00662`, `ALRT-00663`) across both memory and ablation modes:

```bash
python scripts/warm_cache.py
```

Results are saved to `results/demo_cache.json`. When cached, subsequent requests return instantaneously with `"cached": true` and maintain resilience against external API hiccups.

---

## 7. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health status of the memory core and reasoning engine |
| `GET` | `/api/alerts` | List all replay queue alerts (id, title, severity, host, user, cached_state) |
| `GET` | `/api/alerts/{id}` | Full detail and context signals for a specific alert |
| `POST` | `/api/analyze/{id}?mode=memory` | Run full memory recall, context verification, and reasoning |
| `POST` | `/api/analyze/{id}?mode=nomemory` | Run isolated reasoning without historical memory recall |

---

## 8. Demonstration Flow

1. **Login Screen**:
   - Status indicator displays `● Memory Core Online` when `/api/health` is verified.
   - Pre-filled credentials (`analyst.priya` / `demo`) allow one-click entry into the workspace.
2. **Alert Queue**:
   - `ALRT-00663` is pinned at the top with a prominent `DEMO ALERT` tag.
   - Real-time search enables filtering by ID, host, user, severity, and title.
3. **Investigation & Analysis**:
   - Click `Analyze with Hindy` to trigger live or cached analysis.
   - **State Badge**: Shows honest SOC risk states:
     - `GREEN`: "LOW RISK. Analyst quick-confirm recommended."
     - `YELLOW`: "REVIEW REQUIRED"
     - `RED`: "HIGH RISK. Human investigation required."
   - **Memory Badges**: Highlights whether memory was found and whether memory applies based on zero key-signal differences.
   - **Context Match Meter**: Segmented indicator displaying exact match count (e.g., `4 / 10 signals match`).
   - **Git-Style Context Diff**: Highlighting exact signal divergence between historical cases and current alert.
   - **Memory Trail**: Recalled cases with senior analyst notes and verdicts.
   - **Why This Memory?**: Deterministic explanation breakdown without secondary LLM latency.
   - **Compare Without Memory**: Side-by-side comparison illustrating how isolated reasoning lacks context.
4. **Hindy Agent Panel (Right Side)**:
   - Three quick-action focus buttons:
     - *"Why did you decide this?"* → Scrolls to synthesized reasoning and recommendation.
     - *"Show context differences"* → Highlights the git-style context diff.
     - *"Show previous investigation"* → Focuses the historical memory trail.

---

## 9. Security & Architecture Integrity

- **Backend-Only Secrets**: Neither Groq nor Hindsight API keys are ever transmitted across browser requests or bundled into client assets.
- **Ground Truth Isolation**: The API and Frontend never read, import, or reference `data/ground_truth.json`.
- **No Fabricated Confidence**: All states, signals, and diffs reflect genuine engine outputs.
