# Usage / Development Notes

Quick steps to run the project for development.

1) Install dependencies

- Node / npm for Tauri frontend dev tools and building the Tauri app.
- Python 3.10+ (recommended) and pip packages: `fastapi`, `uvicorn`, `sqlmodel`, `pydantic`.

Example Python virtualenv and install (Windows example shown in Makefile):

```bash
python -m venv venv
venv\Scripts\activate
pip install fastapi uvicorn sqlmodel
```

2) Load the Bible dataset (optional)

```bash
python src-python/load_bible.py
```

This will create `bible_note.db` and populate the `Verse` table from `src-python/en_kjv.json`.

3) Run the backend API

```bash
uvicorn main:app --app-dir src-python --reload --port 8000
```

4) Serve or open the frontend

- For quick local testing, open the files in `src/` (e.g., `src/read.html`) in a browser and ensure the API base URL in the JS (default `http://localhost:8000`) is reachable.
- To run with Tauri (desktop shell) in dev mode:

```bash
npm install
npm run tauri dev
```

Notes
- The frontend uses a hard-coded API base (`http://localhost:8000`) in the JavaScript files. If running under Tauri or a different host, adjust accordingly.
- Database file `bible_note.db` is created in the project root when the API starts (or when `load_bible.py` runs).
