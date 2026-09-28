# Repository Guidelines

## Project Structure & Module Organization

- `agent/` contains the SOC memory and alert-analysis logic; `agent/soc_agent.py` is the core engine.
- `api/main.py` exposes the FastAPI application and keeps backend-only integrations behind REST endpoints.
- `frontend/` is the React, TypeScript, Vite, and Tailwind client. Put reusable UI in `frontend/src/components/`, shared client types in `frontend/src/types.ts`, and static files in `frontend/public/` or `frontend/src/assets/`.
- `data/` holds replay alerts, company context, analyst overrides, and evaluation fixtures. Treat `data/ground_truth.json` as evaluation-only; it must not be imported by the API or UI.
- `scripts/` provides dataset loading, evaluation, cache warming, and diagnostics. Generated outputs belong in `results/`.

## Build, Test, and Development Commands

From the repository root, create `.env` from `.env.example` and supply Hindsight and Groq credentials. Run the backend with:

```powershell
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
python scripts/warm_cache.py
python scripts/run_replay_eval.py
```

The cache script refreshes `results/demo_cache.json`; the replay evaluation produces benchmark results. For the client:

```powershell
cd frontend
npm install
npm run dev
npm run lint
npm run build
```

`lint` runs Oxlint, while `build` type-checks with TypeScript and creates the Vite production bundle.

## Coding Style & Naming Conventions

Use four-space indentation and type hints for Python. Keep Python functions and variables in `snake_case`, classes in `PascalCase`, and constants in `UPPER_SNAKE_CASE`. Preserve the existing structured logging and avoid swallowing exceptions without logging context.

Use TypeScript with two-space indentation. React components, component files, and exported types use `PascalCase` (for example, `InvestigationView.tsx`); hooks and handlers use `camelCase`. Keep API response shapes centralized in `frontend/src/types.ts`. Run `npm run lint` and `npm run build` before submitting frontend changes.

## Testing & Evaluation

There is currently no separate unit-test framework. Validate backend changes with the replay evaluation and, when applicable, `python scripts/diagnose_eval.py`. Validate UI changes with linting, a production build, and a manual local flow against `http://127.0.0.1:8000`. Do not alter committed evaluation fixtures merely to improve scores.

## Commit & Pull Request Guidelines

Recent commits use concise imperative subjects, such as `Update SOC Analyst and memory agent components` and `Record completed Evaluation V2 benchmark results`. Keep each commit focused and describe the affected area. Pull requests should explain behavior changes, list validation commands and results, link related issues when available, and include screenshots for visible frontend changes. Never commit `.env`, credentials, or generated local environment files.
