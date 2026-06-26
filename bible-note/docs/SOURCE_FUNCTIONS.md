# Source Code: Key Functions and Files

This document lists the important functions, endpoints, and responsibilities found across the codebase.

Frontend (src/)
- `read.js`
  - `showScreen(id)` — show the requested screen, hide others.
  - `navTo(tab)` — switch navbar state and optionally load books.
  - `showBooks()` — fetch `GET /books`, render book grid, attach search handler.
  - `renderBooks(books)` — render book cards.
  - `showChapters(abbrev, name)` — fetch chapters and render chapter grid.
  - `showReader(chapter)` — fetch `GET /verses/{book_abbrev}/{chapter}` and render verses.

- `portals.js`
  - `init()` — load books and initial portal list.
  - `loadPortals()` — `GET /portals` and render list.
  - `formatPassage(p)` — format portal chapter/verse range into human-readable string.
  - `openDeleteModal(event, btn)`, `closeDeleteModal()` — portal delete modal UI.
  - `confirmDelete()` — `DELETE /portals/{id}` then reload portals.
  - `openModal()`, `closeModal()` — create-portal modal UI.
  - `savePortal()` — POST to `/portals` to create a portal.
  - `openPortal(id)` — navigate to `portal_reader.html?id={id}`.

- `portal_reader.js` (largest file)
  - `init()` — load portal, verses, layers, and set up UI behavior.
  - `loadVerses()` — `GET /portals/{id}/verses`, populate verse DOM and cache text.
  - `loadLayers()` — `GET /portals/{id}/layers`, render layers, set default active layer.
  - `renderLayers()` — render layer pills UI.
  - `setActiveLayer(layer)` — set active layer, load highlights for it.
  - `saveLayer()` — `POST /portals/{id}/layers` to create layer.
  - `confirmDeleteLayer()` — delete layer by calling `DELETE /layers/{id}` and refresh.
  - `setupHighlighting()` — attach click and selection handlers for creating highlights; calls `POST /layers/{id}/highlights`.
  - `applyHighlight(h)`, `renderHighlights()` — apply highlight visuals to verse text (full or partial via offsets).
  - `appendNote(h)`, `renderNotes()`, `clearNotesUI()` — manage note boxes in the overlay, including draggable UI.
  - `saveNote(noteId, content)` — `PUT /notes/{noteId}` to persist note content.
  - `deleteHighlight(highlightId)` — `DELETE /highlights/{id}` and update UI state.
  - `makeDraggable(el, noteId)` — implement note dragging and save updated coords to backend on release.
  - `setupSidebarBehaviour()` — sidebar hover/dim behaviour.

Backend (src-python/)
- `main.py` (FastAPI endpoints)
  - `on_startup()` — calls `create_db()` to ensure schema exists.
  - `ping()` — `GET /ping` healthcheck.
  - `get_books()` — `GET /books` distinct list.
  - `get_chapters(book_abbrev)` — `GET /chapters/{book_abbrev}`.
  - `get_verses(book_abbrev, chapter)` — `GET /verses/{book_abbrev}/{chapter}`.
  - `get_portals()`, `get_portal(portal_id)`, `create_portal(data)`, `delete_portal(portal_id)` — CRUD for portals.
  - `get_portal_verses(portal_id)` — fetch verses within portal range.
  - `get_layers(portal_id)`, `create_layer(portal_id, data)`, `delete_layer(layer_id)` — layer CRUD with cascade removal of highlights/notes.
  - `get_highlights(layer_id)`, `create_highlight(layer_id, data)`, `delete_highlight(highlight_id)` — highlight CRUD.
  - `update_note(note_id, data)` — update note content and/or position.

- `database.py`
  - `Verse`, `Portal`, `Layer`, `Highlight`, `Note` — SQLModel table definitions.
  - `create_db()` — create tables.
  - `get_session()` — generator yielding a `Session` for dependency injection in FastAPI.

- `load_bible.py`
  - `clean_verse(raw)` — cleans translator markup from JSON text.
  - `load_bible()` — reads `en_kjv.json`, creates `Verse` records in the DB.

Tauri (src-tauri/)
- `lib.rs`
  - `greet(name: &str) -> String` — example command exposed to the frontend.
  - `run()` — builds and runs Tauri with `greet` as an invokable command.

Config and build
- `package.json` — `scripts.tauri` defined; dev dependency on `@tauri-apps/cli`.
- `Makefile` — `app` target runs `npm run tauri dev`; `server` target shows a Windows uvicorn invocation.
