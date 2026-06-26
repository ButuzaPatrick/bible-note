# Codebase review and recommendations

## Summary
The app is a small but growing local-first Bible note tool with a browser UI, a FastAPI backend, and a Tauri wrapper. The core flow is understandable: the reader page loads verses and layers, highlights text, and creates notes attached to highlights.

## What is working well
- The app keeps the frontend and backend concerns fairly separate.
- The note/highlight flow is simple enough to reason about without a framework.
- The SQLite-backed backend is lightweight and easy to run locally.

## Main concerns
1. Frontend state is still managed imperatively and spread across several functions.
   - The portal reader mixes DOM updates, network calls, and state updates in one place.
   - A small shared state helper or module would make future changes safer.

2. Note placement and rendering currently depend on several branches.
   - The note UI should use one consistent render path for both initial creation and later re-rendering.
   - This would make positioning and persistence easier to debug.

3. The backend still uses simple table creation on startup.
   - A migration-based setup would be more robust once the schema evolves.
   - This is especially important if note fields or highlight metadata change over time.

4. The current API layer is functional, but it would benefit from stricter validation.
   - Note coordinates, portal ranges, and highlight payloads should be validated explicitly.
   - This reduces the chance of malformed data reaching the database.

5. There is no automated test coverage yet.
   - Adding a few small API tests and one UI regression test would prevent common regressions.

## Recommended next steps
- Prioritize one shared note-rendering path and one shared state update path.
- Introduce a small backend migration workflow instead of relying only on schema creation.
- Add validation for note position payloads and highlight creation requests.
- Add a small regression test for note creation and note persistence.
- Keep adding docstrings and type hints around the core API and stateful UI helpers.
