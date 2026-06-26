# Getting Started

A short guide to run the app locally and add features.

## Overview

This repository contains three parts:
- Frontend (static files): `src/` — HTML/CSS/JS for reading, portals and portal reader.
- Backend API: `src-python/` — FastAPI application, SQLite via `sqlmodel`.
- Desktop wrapper: `src-tauri/` — Tauri (Rust) project that can run the frontend as a desktop app.

## Prerequisites

- Python 3.10+ (Windows examples below). 
- Node.js + npm (only required for Tauri/dev frontend).
- Rust toolchain (only required to build the Tauri desktop app).

## Setup (backend)

1. Create and activate a virtual environment (Windows):

```powershell
python -m venv venv
venv\Scripts\activate
```

2. Install Python dependencies:

```powershell
pip install fastapi uvicorn[standard] sqlmodel
```

3. Populate the database with the included KJV JSON (optional, required to browse verses):

```powershell
python src-python/load_bible.py
```

This creates/updates `bible_note.db` in the project root.

## Run (backend API)

- Direct (recommended for development):

```powershell
# from project root
python -m uvicorn main:app --app-dir src-python --reload --port 8000
```

- Or use the Makefile server target on Windows (requires `make`):

```powershell
make server
```

The API will be available at `http://localhost:8000`. Quick endpoint: `/ping`.

## Run (frontend)

- Static (easy): open the HTML files directly from `src/` in your browser, for example `src/read.html` or `src/portal_reader.html`. The frontend expects the backend at `http://localhost:8000` by default.

- Tauri (desktop development): requires Node, `@tauri-apps/cli` and Rust. From the project root:

```powershell
npm install
npm run tauri dev
```

or use the Makefile app target:

```powershell
make app
```

## Add to the system (developer guide)

- Frontend changes:
  - Edit or add pages in `src/` (`read.html`, `portals.html`, `portal_reader.html`) and update corresponding JS in `src/*.js`.
  - UI state is persisted by calling the backend API (POST/PUT/DELETE endpoints defined in `src-python/main.py`).

- Backend changes:
  - Add or modify endpoints in `src-python/main.py`.
  - Add or modify models in `src-python/database.py`. Run `create_db()` (called at startup) to create new tables.
  - When adding new database models, consider migration strategy (currently there is no migration tool included).

- Data loading:
  - `src-python/load_bible.py` loads `src-python/en_kjv.json` into the `Verse` table. Re-run after schema changes if needed.

- Tauri:
  - The Tauri Rust code is under `src-tauri/`. Use `npm run tauri dev` for development. Build releases via the Tauri docs.

## Useful commands (summary)

- Start backend (fast): `python -m uvicorn main:app --app-dir src-python --reload --port 8000`
- Load bible data: `python src-python/load_bible.py`
- Tauri dev: `npm run tauri dev` or `make app`

## Notes & Troubleshooting

- Database file `bible_note.db` is created in the project root; delete it to reset (data will be recreated if you re-run `load_bible.py`).
- The backend adds CORS entries for `tauri://localhost` and `http://localhost:1430` in `src-python/main.py` — adjust if you serve the frontend from a different origin.
- If you add new SQLModel fields, you will need to recreate the database or add migrations.

If you'd like, I can also:
- add a `requirements.txt` and a one-line developer README in the repo root,
- or create a small script to automate venv creation + dependency install.
