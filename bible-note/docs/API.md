# API Reference

This file documents the backend REST API exposed by the FastAPI app in `src-python/main.py`.

Base URL (development): `http://localhost:8000`

Models (SQLModel tables defined in `src-python/database.py`)
- `Verse` — fields: `id`, `book`, `book_abbrev`, `chapter`, `verse_number`, `text`.
- `Portal` — fields: `id`, `title`, `book`, `book_abbrev`, `chapter_start`, `verse_start`, `chapter_end`, `verse_end`.
- `Layer` — fields: `id`, `portal_id`, `title`, `colour`, `order`.
- `Highlight` — fields: `id`, `layer_id`, `verse_id`, `start_offset`, `end_offset`, `full_verse`.
- `Note` — fields: `id`, `highlight_id`, `content`, `x`, `y`.

Endpoints
---------

- `GET /ping`
  - Returns: `{"status": "ok"}`

- `GET /books`
  - Returns: list of available books as objects `{ book, abbrev }`.

- `GET /chapters/{book_abbrev}`
  - Path param: `book_abbrev` (string)
  - Returns: list of chapter numbers for the book.

- `GET /verses/{book_abbrev}/{chapter}`
  - Path params: `book_abbrev` (string), `chapter` (int)
  - Returns: list of `Verse` objects for that chapter (ordered by `verse_number`).

Portal endpoints
- `GET /portals` — returns all `Portal` records.
- `GET /portals/{portal_id}` — get a single `Portal` by id (404 if not found).
- `POST /portals` — create a new `Portal` using JSON body matching `PortalCreate`:
  - JSON example: `{ "title": "Name", "book": "Genesis", "book_abbrev": "Gen", "chapter_start": 1, "verse_start": 1, "chapter_end": 2, "verse_end": 3 }`
- `DELETE /portals/{portal_id}` — delete portal by id (404 if not found).
- `GET /portals/{portal_id}/verses` — returns verses that fall within the portal's range.

Layer endpoints
- `GET /portals/{portal_id}/layers` — list layers for a portal, ordered by `order`.
- `POST /portals/{portal_id}/layers` — create a `Layer` (body fields: `title`, `colour`, `order`).
- `DELETE /layers/{layer_id}` — delete a `Layer` and cascade-delete its highlights and associated notes.

Highlight endpoints
- `GET /layers/{layer_id}/highlights` — list highlights for a layer. Each highlight is returned with its associated `note` embedded (if present).
- `POST /layers/{layer_id}/highlights` — create a `Highlight` by JSON body matching `HighlightCreate`:
  - Example: `{ "verse_id": 123, "start_offset": 5, "end_offset": 20, "full_verse": false }`
  - On create, the server also creates a default `Note` for this highlight (empty content and default x/y) and returns both highlight and note info.
- `DELETE /highlights/{highlight_id}` — delete highlight and its note (if present).

Notes
- `PUT /notes/{note_id}` — update one or more fields on `Note` (`content`, `x`, `y`). Returns the updated note.

Authentication
- None — the API is intentionally simple and has no authentication.

Database
- SQLite used via SQLModel; database file: `bible_note.db` (created by `create_db()` called on startup).
- `src-python/load_bible.py` loads `src-python/en_kjv.json` into the `Verse` table.
