# Architecture Overview

This project is composed of three main layers:

1. Frontend (static app) — `src/`
   - Plain HTML/CSS/JavaScript. Files:
     - `read.html`, `read.js`, `read.css` — main reader UI for browsing books, chapters, and verses.
     - `portals.html`, `portals.js`, `portals.css` — UI for creating and listing Portals.
     - `portal_reader.html`, `portal_reader.js`, `portal_reader.css` — reader with Layers, Highlights, and Notes.
   - The frontend calls the backend API (default: `http://localhost:8000`) to fetch book data and persist Portals, Layers, Highlights and Notes.

2. Backend API — `src-python/` (FastAPI + SQLModel)
   - `main.py` defines the FastAPI app and all HTTP endpoints.
   - `database.py` defines SQLModel models and database access (SQLite via SQLModel create_engine).
   - `load_bible.py` loads bible text (KJV JSON) into the `Verse` table.
   - Startup hook: `create_db()` is called on application startup to ensure database tables exist.

3. Tauri Desktop Wrapper — `src-tauri/` (Rust)
   - Minimal Tauri entrypoint exposing a `greet` command and starting the Tauri runtime via `run()` in `lib.rs`.
   - `tauri.conf.json` configures the embedded frontend distribution (`build.frontendDist` points to `../src`).

Data flow
- Frontend issues fetch() requests to the backend endpoints for read operations and POSTS/PUTS/DELETEs to modify state.
- Backend persists Portals, Layers, Highlights and Notes in the SQLite database.
- The frontend renders highlights by combining server-provided offsets with cached verse text.

Storage
- SQLite database file: `bible_note.db` at project root (the `DATABASE_URL` is `sqlite:///bible_note.db`).

Run modes
- Development
  - Backend: run `uvicorn main:app --app-dir src-python --reload` (Makefile `server` target shows a Windows path).
  - Frontend: open `src/read.html` and related HTML files (or use Tauri dev mode via `npm run tauri dev`).

Notes and constraints
- No auth — intended as a local, single-user study tool.
- The Tauri layer is a thin wrapper; main application logic lives in the static frontend and Python backend.
