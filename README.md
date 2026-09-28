# 🛡️ HINDY — Experience-Driven SOC Memory Agent

<p align="center">
  <img src="./docs/hindy_robot.png" alt="HINDY 3D Mascot" width="220" />
</p>

<p align="center">
  <strong>"Remembers everything. Verifies before trusting."</strong><br>
  An intelligent, persistent-memory security operations agent designed to eliminate repetitive alert fatigue, catch sophisticated lookalike threats, and preserve institutional analyst knowledge.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white" alt="Python 3.10+" />
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Memory_Core-Hindsight-8A2BE2?style=flat" alt="Hindsight" />
  <img src="https://img.shields.io/badge/Reasoning-Groq_Llama_3-F55036?style=flat" alt="Groq" />
</p>

---

## 📌 Table of Contents
1. [Overview & Core Value](#-overview--core-value)
2. [How Persistent Memory Works in HINDY](#-how-persistent-memory-works-in-hindy)
3. [The HINDY Learning Loop](#-the-hindy-learning-loop)
4. [Application Pages & Workflows](#-application-pages--workflows)
5. [Evaluation & Benchmark Results](#-evaluation--benchmark-results)
6. [Tech Stack](#-tech-stack)
7. [Project Structure](#-project-structure)
8. [Setup & Installation](#-setup--installation)
9. [Running the Application](#-running-the-application)
10. [Authentication & User Management](#-authentication--user-management)
11. [Security & Privacy Principles](#-security--privacy-principles)

---

## 🧠 Overview & Core Value

Traditional Security Operations Centers (SOCs) suffer from two chronic bottlenecks:
1. **Alert Fatigue from Recurring Benign Activity**: Analysts repeatedly investigate identical scheduled backups, admin maintenance windows, and scanner sweeps day after day.
2. **Missed Lookalike Attacks**: Attackers intentionally blend in by mimicking known benign patterns (e.g., executing PowerShell scripts during change windows or scanning non-standard subnets). Without memory of exact past baseline parameters, single-pass LLMs suffer from high false-green rates.

**HINDY (Hindsight Dynamic Security Agent)** bridges this gap by retaining historical investigation context in a dedicated memory core. When a new alert triggers, HINDY retrieves verified historical precedents, performs fine-grained **signal-difference analysis**, and provides grounded recommendations while ensuring the human SOC analyst retains final operational authority.

---

## 🔍 How Persistent Memory Works in HINDY

```
                     ┌────────────────────────────────┐
                     │     Incoming Security Alert    │
                     └───────────────┬────────────────┘
                                     │
                                     ▼
                     ┌────────────────────────────────┐
                     │    Hindsight Memory Recall     │
                     │  (Semantic + Keyword + Entity) │
                     └───────────────┬────────────────┘
                                     │
                                     ▼
                     ┌────────────────────────────────┐
                     │    Context Signal Differencing │
                     │   (User, Host, Subnet, Hours)  │
                     └───────────────┬────────────────┘
                                     │
                                     ▼
                     ┌────────────────────────────────┐
                     │     Groq Reasoning Engine      │
                     │  (Assess Deviation & Precedent)│
                     └───────────────┬────────────────┘
                                     │
                                     ▼
                     ┌────────────────────────────────┐
                     │   Human Analyst Sign-Off (HITL)│
                     └───────────────┬────────────────┘
                                     │
                                     ▼
                     ┌────────────────────────────────┐
                     │  Retained Experience Feedback  │
                     │  (Stored into Hindsight Bank)  │
                     └────────────────────────────────┘
```

1. **Context Ingestion**: Real-world alert metadata (host, user, process tree, network parameters, time-of-day).
2. **Experience Recall**: HINDY queries the Hindsight memory core (`soc-memory` bank) for semantically related past cases.
3. **Signal Difference Analysis**: Automatically computes exact field-by-field differences between the current alert and the past baseline (e.g., *Target Subnet changed from 10.20.0.0/24 to 10.50.0.0/24*).
4. **Safety-First Classification**:
   - 🟢 **GREEN (Benign)**: Exact parameter match to verified recurring benign operational baseline.
   - 🟡 **YELLOW (Human Review)**: Match with key signal deviations (lookalike threat candidate).
   - 🔴 **RED (Critical Threat)**: Malicious behavior pattern or known attack indicators.
5. **Human-in-the-Loop Feedback**: Analyst reviews, modifies rationale, confirms final disposition, and HINDY stores the verified lesson into the memory bank.

---

## 🔄 The HINDY Learning Loop

```
Past Incident → Retained Memory → New Alert → Signal Diff → HINDY Assessment → Human Decision → Memory Retained ↺
```

- **Investigation**: Live triaging with contextual memory assistance and suggested validation commands.
- **Memory**: Searchable organizational knowledge base categorized by ATT&CK techniques, analysts, and verdicts.
- **Replay**: Time-machine capability allowing analysts to inspect how historical lessons directly changed subsequent alert outcomes.
- **Evaluation**: Side-by-side benchmark comparing accuracy with and without memory.

---

## 🖥️ Application Pages & Workflows

### 1. 🚀 Login / Sign Up Portal
- **Authentic Authentication**: Full account creation and login support with salted `PBKDF2-HMAC-SHA256` hashing.
- **Interactive 3D HINDY Mascot**: Lightweight DOM-rendered 3D character featuring natural periodic blinking, idle floating physics, and dynamic 60fps eye-gaze cursor tracking.
- **Quick Demo Switcher**: Pre-configured buttons for instant 1-click access as *Priya Nair (SOC Lead)* or *Arjun Rao (Analyst)*.

### 2. 📊 Dashboard (SOC Operations Command Center)
- **Live Alert Queue**: Ranked by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and timestamp.
- **Queue State Filtering**: Toggle between **Pending Triage** (active workload) and **Decided Alerts** (already investigated and retained).
- **Executive Metrics**: Active alerts, high-risk items, triage queue velocity, and Memory Core health status.

### 3. 🛡️ Investigation View
- **Selected Alert Telemetry**: Full context, parameters, host, user, network details, and MITRE ATT&CK mapping.
- **Dynamic HINDY Assessment**: Live button to analyze alert with memory; highlights recalled precedents, similarity scores, and signal differences.
- **Suggested Security Checks**: Grounded next-step triage actions (e.g., DNS verification, MFA log inspection).
- **Analyst Decision Panel**: Quick-confirm benign actions or customize ticket rationale before committing to memory.

### 4. 🗄️ Memory View
- **Institutional Knowledge Base**: Search and filter all retained incident investigations.
- **Analyst Attribution**: See which SOC team member authored each memory and its exact resolution note.
- **Live Memory Overrides**: View live experiences learned during the current session.
- **Reset Controls**: Easily clear live demo overrides to restore baseline benchmark state.

### 5. ⏪ Replay View
- **Experience Timeline**: Demonstrates cause-and-effect learning across paired security alerts.
- **Step-by-Step Replay**: Compare the initial incident investigation against a subsequent alert that recalled that exact experience.

### 6. 📈 Evaluation View
- **Evidence-Driven Benchmark**: Side-by-side comparison of **WITH HINDY** vs. **WITHOUT HINDY** on 94 evaluated simulation alerts.
- **Alert-by-Alert Table**: Inspect every individual alert to see how memory changed or corroborated decisions.
- **Slide-Over Detail Modal**: Full side-by-side comparison of runtime latency, model reasoning, and recalled cases.
- **Methodology Transparency**: Explicitly presents benchmark sample details (seed 42) and methodology constraints.

### 7. ⚙️ Settings / Profile Page
- **Analyst Profile**: View and edit Name, Work Email, SOC Operational Role, and Clearance Tier.
- **Session & Security Status**: Cryptographic session information and active workstation token verification.
- **Top-Right Profile Menu**: Clickable dropdown with quick profile access and instant **Log Out**.

---

## 📊 Evaluation & Benchmark Results

Measured across 94 replay simulation alerts (10 attack variants, 44 lookalike variants, 40 recurring benign variants):

| Metric | With HINDY (Memory Active) | Without Memory | Significance |
| :--- | :---: | :---: | :--- |
| **Attacks Caught** | **10 / 10 (100%)** | 10 / 10 (100%) | All critical threats detected |
| **False Greens (Missed Threats)** | **0** | **23** | **Memory prevents lookalike attacks from slipping through** |
| **Benign Escalations** | **17 / 40 (42.5%)** | 1 / 40 (2.5%) | Safety-first review on signal deviations |
| **Human Review Load** | **71 / 94 (75.5%)** | 32 / 94 (34.0%) | Deliberate triage of ambiguous lookalikes |
| **Average Investigation Time** | **10.11s** | **3.61s** | Multi-stage retrieval and signal diffing |

---

## 🛠️ Tech Stack

### Backend
- **Language**: Python 3.10+
- **Framework**: FastAPI, Uvicorn
- **Memory Core**: Hindsight Client SDK (`hindsight-client`)
- **Reasoning LLM**: Groq SDK (`groq`, Llama-3.3-70b / GPT-OSS)
- **Data Serialization**: Pydantic v2
- **Security**: Python Standard Library `hashlib` (PBKDF2-HMAC-SHA256) & `secrets`

### Frontend
- **Framework**: React 19, TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS, Vanilla CSS animations, Glassmorphism, Dark Futuristic Cyberpunk Theme
- **Icons**: Lucide React
- **Linter**: Oxlint / TypeScript Compiler

---

## 📁 Project Structure

```
Security_Agent/
├── agent/                      # Core SOC Agent reasoning & memory integration
│   └── soc_agent.py            # Primary investigation & signal-difference engine
├── api/                        # FastAPI REST backend
│   ├── main.py                 # API routes, auth, alerts, reset, evaluation
│   └── demo_pair.json          # Demo learning pair configuration
├── data/                       # Datasets and state storage
│   ├── alerts.json             # Alert telemetry dataset (history + replay)
│   ├── analyst_overrides.json  # Stored analyst decisions & live memories
│   ├── company.json            # Organizational context & baseline assets
│   ├── users.json              # Authenticated user accounts & password hashes
│   └── ground_truth.json       # Evaluation benchmark ground truth (eval-only)
├── docs/                       # Documentation assets
│   └── hindy_robot.png         # HINDY 3D Mascot asset
├── frontend/                   # React + TypeScript + Vite web client
│   ├── src/
│   │   ├── components/         # Reusable UI views & components
│   │   │   ├── DashboardView.tsx       # Alert queue & triage dashboard
│   │   │   ├── InvestigationPage.tsx   # Live investigation & signal differencing
│   │   │   ├── MemoryView.tsx          # Institutional memory bank explorer
│   │   │   ├── ReplayView.tsx          # Historical investigation replay
│   │   │   ├── EvaluationView.tsx      # Benchmark evaluation dashboard
│   │   │   ├── SettingsView.tsx        # Analyst profile & settings
│   │   │   ├── LoginModal.tsx          # Login / Sign-up portal with 3D mascot
│   │   │   ├── TopBar.tsx              # Workspace header & user profile dropdown
│   │   │   ├── Sidebar.tsx             # Navigation sidebar with mini 3D mascot
│   │   │   └── HindyAvatar.tsx         # Interactive eye-tracking mascot component
│   │   ├── types.ts            # Shared TypeScript type definitions
│   │   ├── App.tsx             # Application routing & session management
│   │   └── main.tsx            # React application entry point
│   ├── package.json
│   └── vite.config.ts
├── results/                    # Pre-generated benchmark evaluation outputs
│   ├── eval_summary.json       # V2 / V1 evaluation metrics
│   └── replay_cache.json       # Pre-computed replay execution traces
├── scripts/                    # CLI tools & evaluation runners
│   ├── evaluate.py             # Evaluation benchmark runner
│   ├── load_history.py         # History memory ingest script
│   └── warm_cache.py           # Demo cache warming script
├── requirements.txt            # Python dependencies
├── .env.example                # Example environment configuration
└── README.md                   # Project documentation
```

---

## ⚙️ Setup & Installation

### 1. Prerequisites
- **Python**: Version 3.10 or higher
- **Node.js**: Version 18 or higher (with `npm`)
- **API Keys**:
  - Hindsight API Key & Bank ID ([Hindsight](https://hindsight.vectorize.io))
  - Groq API Key ([Groq Console](https://console.groq.com))

### 2. Clone Repository
```powershell
git clone https://github.com/Siva402-ai/SecurityAgent.git
cd SecurityAgent
```

### 3. Backend Setup
```powershell
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env
```

Edit `.env` and supply your credentials:
```ini
HINDSIGHT_API_KEY=your_hindsight_api_key_here
HINDSIGHT_BANK_ID=soc-memory
HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Frontend Setup
```powershell
cd frontend
npm install
cd ..
```

---

## 🚀 Running the Application

### Option A: Run Backend & Frontend in Parallel

**Terminal 1 — Backend (FastAPI)**:
```powershell
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend (Vite Client)**:
```powershell
cd frontend
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5173
```

---

## 👤 Authentication & User Management

| Username / Email | Password | Role | Access Level |
| :--- | :--- | :--- | :--- |
| `analyst.priya` / `priya.nair@example.com` | `demo` | SOC Lead Tier-3 | Senior Lead |
| `analyst.arjun` / `arjun.rao@example.com` | `password123` | SOC Analyst | Tier-2 Analyst |

*You can also click **Sign Up** on the login page to register your own custom analyst account.*

---

## 🔒 Security & Privacy Principles

1. **Zero Plaintext Passwords**: Passwords are cryptographically salted and hashed using standard `PBKDF2-HMAC-SHA256`.
2. **Ground Truth Isolation**: `data/ground_truth.json` is strictly restricted to evaluation scripts and is never imported or exposed to the API or UI.
3. **No Unintentional Exfiltration**: Sensitive credentials, API keys, and local environment files (`.env`) are excluded via `.gitignore`.
4. **Human-in-the-Loop Authority**: HINDY never automatically isolates hosts or closes critical alerts without explicit analyst sign-off.

---

## 📄 License

This project is licensed under the **MIT License**.
