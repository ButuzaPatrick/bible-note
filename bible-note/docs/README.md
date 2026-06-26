Bible Note — Documentation
===========================

This documentation describes the `bible-note` project: its purpose, architecture, APIs, and main code components.

See the other files in this `docs/` folder for detailed information:

- `ARCHITECTURE.md` — high-level architecture and component responsibilities.
- `API.md` — REST API endpoints, request/response shapes, and models.
- `SOURCE_FUNCTIONS.md` — index of important functions across frontend, backend, and Tauri code.
- `USAGE.md` — how to run the app locally for development.

This repository contains:

- Frontend static UI (HTML/CSS/JS) in `src/`.
- Backend API and database models in `src-python/` using FastAPI and SQLModel.
- A Tauri wrapper (Rust) in `src-tauri/` to build a desktop app shell.

The application stores Bible text in a local SQLite database (`bible_note.db`) and provides
study features such as Portals (passage groups), Layers (highlight groups), Highlights and Notes.
