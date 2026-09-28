# SOC Memory Agent

A security operations center (SOC) memory agent that leverages [Hindsight Cloud](https://hindsight.vectorize.io/) to retain, recall, and reason over past security investigation experiences and alert outcomes.

---

## 1. Required Python Package Installation

Install the required dependencies using `pip`:

```bash
pip install hindsight-client python-dotenv
```

- `hindsight-client`: Official Python SDK for Hindsight Cloud and local Hindsight daemons.
- `python-dotenv`: Loads configuration and credentials securely from `.env`.

---

## 2. Required `.env` Variables

Create a `.env` file in the root directory with the following variables:

```dotenv
# Hindsight Cloud API Key (from https://ui.hindsight.vectorize.io)
HINDSIGHT_API_KEY=your_hindsight_api_key_here

# Target Memory Bank ID
HINDSIGHT_BANK_ID=soc-memory

# Optional: API base URL (defaults to https://api.hindsight.vectorize.io)
HINDSIGHT_API_URL=https://api.hindsight.vectorize.io
```

> **Security Note**: Never commit `.env` or hardcode API keys. Ensure `.env` is listed in `.gitignore`.

---

## 3. How to Run `scripts/load_history.py`

The ingestion script supports safety verification, bulk ingestion, and memory recall testing:

### Step A: Run Safety One-Memory Test First
Before bulk ingestion, verify that Hindsight Cloud accepts memories and returns relevant context via recall:

```bash
python scripts/load_history.py --test-only
```

What this does:
1. Validates `data/alerts.json` and calculates the actual historical alert count (phase == `history`).
2. Retains **only the first historical alert** (`ALRT-00001`) with structured security-experience text, metadata, and tags.
3. Verifies that the retain call succeeds and records the ID into `data/loaded_ids.json`.
4. Executes a recall query (`"2 AM large backup transfer from db-prod-01"`) and prints the top 5 recalled memory units.
5. **Safely stops** without modifying or ingesting the remaining alerts.

### Step B: Bulk Ingestion of Remaining Historical Alerts
Once the test succeeds, bulk load all remaining historical alerts:

```bash
python scripts/load_history.py --bulk
```

What this does:
1. Reads `data/loaded_ids.json` to skip already-ingested alerts.
2. Sequentially sends each pending historical alert with exponential backoff retries on network/rate limit errors.
3. Updates `data/loaded_ids.json` immediately after each successful retention.
4. Prints real-time progress (e.g., `50/514`, `100/514`) and a final summary report with token usage and elapsed time.

### Step C: Test Memory Recall
You can run ad-hoc recall queries against your memory bank at any time:

```bash
python scripts/load_history.py --recall "2 AM large backup transfer from db-prod-01"
```

---

## 4. How Idempotent Resume Works

Idempotency and resume capability are managed via `data/loaded_ids.json`:

1. **State Persistence**: Each time an alert is successfully retained in Hindsight Cloud, its `alert_id` is recorded in `data/loaded_ids.json`.
2. **Safe Restart**: If ingestion is interrupted (e.g. network disconnection, process termination), re-running `python scripts/load_history.py --bulk` loads `data/loaded_ids.json` and skips all previously ingested alerts.
3. **No Partial State**: Failed alerts are not added to `data/loaded_ids.json` and will be retried automatically on subsequent runs.
4. **Atomic Updates**: `data/loaded_ids.json` is updated atomically on each successful retention to prevent file corruption.
