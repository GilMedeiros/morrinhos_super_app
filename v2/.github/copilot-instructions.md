# Copilot Instructions for Morrinhos Project

## Project Overview
- **Monorepo** for a municipal communication system: manages PDF uploads, queue-based message dispatch ("disparos"), and integrates with Typebot for automated messaging.
- **Main stack:** Node.js (Express), PostgreSQL, Redis, Docker Compose. PDF extraction handled by a Python microservice.
- **Key directories:**
  - `controllers/` – Express route logic (see `apiController.js` for REST API patterns)
  - `services/` – Business logic, queue management (`disparoQueue.js`), PDF extraction (`pdf_extractor/`)
  - `models/` – Data models (see `User.js` for conventions)
  - `config/` – Database, Redis, and Typebot config
  - `view/` – EJS templates for web UI
  - `database/` – Migration scripts and seeds

## Architecture & Data Flow
- **PDFs** are uploaded via the web UI, processed by the Python `pdf_extractor` service, and results are stored in PostgreSQL (`sources` table).
- **Disparos (message queues):**
  - Managed by `disparoQueue.js` and related API endpoints in `apiController.js`.
  - Each disparo is linked to a source (PDF list) and can be started, paused, or deleted via API/UI.
  - Queue state and stats are persisted in PostgreSQL and Redis.
- **Typebot integration:**
  - Configurable via `/configuracoes` UI and `/api/typebot/*` endpoints.
  - Settings stored in `webhook-config.json` (excluded from git).

## Developer Workflows
- **Build & Run:**
  - Use `npm run docker:up` for full stack (see `README.md` and `docker-commands.md` for details).
  - Local dev: `npm run dev` (requires local PostgreSQL/Redis and `.env` setup).
- **Testing:**
  - Placeholder: `npm test` (add tests in `test_*.js` or `test_*.py`).
- **Database migrations:**
  - SQL scripts in `database/migrations/` and helpers in root (e.g., `run-migration.js`).
- **PDF Extractor service:**
  - Python code in `services/pdf_extractor/app/` (see `requirements.txt`).
  - Managed as a Docker service; see `CORRECAO_PDF_EXTRACTOR_README.md` for troubleshooting.

## Project Conventions
- **API:** RESTful, JSON responses, error messages in Portuguese.
- **Views:** EJS, Bootstrap 5, custom styles in `public/css/`.
- **Sensitive config:** Never commit `*-config.json`, `.env`, or `webhook-config.json`.
- **Scripts:** Many root-level scripts for checks/fixes (see file names like `check-*.js`, `fix-*.js`).
- **Cascade deletes:** Use PostgreSQL `ON DELETE CASCADE` for related queue/content cleanup (see `apiController.js`).

## Integration Points
- **External:** Typebot API, Redis, PostgreSQL, Docker Compose, Redis Commander, PgAdmin.
- **Internal:** Node.js ↔ Python via REST (PDF extraction endpoints).

## Examples
- **Add new disparo:** POST `/api/disparos` (see `apiController.js`)
- **Delete source:** DELETE `/api/sources/:id` (cascades to related queues)
- **Test Typebot:** GET `/api/typebot/test`

## References
- See `README.md`, `DOCKER-README.md`, and `CORRECAO_PDF_EXTRACTOR_README.md` for more details and troubleshooting.
