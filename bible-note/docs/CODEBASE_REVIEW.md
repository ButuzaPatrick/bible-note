# Codebase Review and Implementation Advice

## Overall assessment
The project is a strong prototype for a local-first Bible study app. It has a clear separation of concerns across the frontend, Python backend, and Tauri wrapper, and the core user flow is understandable and functional. The main problem is not lack of ambition; it is that the current implementation is still a proof of concept and is becoming fragile as features grow.

## What is working well
- The app has a simple, understandable architecture.
- The local-first design fits the use case well.
- The data model is small enough to maintain without heavy infrastructure.
- The Tauri wrapper is lightweight and does not overcomplicate the app.

## Where the code is weak
1. Frontend structure is too imperative
   - The browser code in the JS files is tightly coupled to the DOM.
   - Global state, inline handlers, and repeated fetch logic make the UI hard to extend.
   - This will become painful once more views or interactions are added.

2. Error handling is thin
   - Network failures, empty API responses, and invalid states are not handled gracefully.
   - The UI often assumes the API succeeds, which makes debugging harder.

3. Backend is functional but not yet robust
   - The FastAPI app is compact, but it mixes endpoint logic, database access, and data validation in one file.
   - There is no real migration strategy, no structured config, and no automated tests.

4. Data integrity is weak
   - The database schema is simple but lacks stronger constraints and safer delete behavior.
   - Highlight and note cleanup is partly handled manually, which can become inconsistent over time.

5. There is no development safety net
   - No tests, linting, or build checks are in place.
   - Small changes can easily break existing flows without early detection.

## Changes I recommend
### Priority 1: Stabilize the app foundation
- Introduce a shared API client for all frontend requests.
- Centralize the base URL in one place instead of hard-coding it in multiple files.
- Add loading, empty, and error states for all major screens.
- Add basic timeout and retry handling for network calls.

### Priority 2: Refactor the frontend structure
- Split the frontend into small modules such as:
  - api.js for all requests
  - state.js for shared app state
  - ui.js for rendering logic
- Replace ad-hoc DOM manipulation with a clearer render/update flow.
- Avoid inline event handlers where possible; use event delegation instead.

### Priority 3: Harden the backend
- Move endpoint logic into routers or smaller service functions.
- Use Pydantic response models and stricter request validation.
- Add consistent error responses for invalid IDs, bad input, and missing resources.
- Introduce database migrations instead of relying on startup table creation only.

### Priority 4: Improve data safety
- Add foreign key constraints and cascade behavior where appropriate.
- Add indexes for commonly queried fields such as book, chapter, portal ID, and layer ID.
- Make note and highlight deletion logic more explicit and predictable.

### Priority 5: Add quality tools
- Add a simple test suite for the main API flows.
- Add linting and formatting checks.
- Add a basic Makefile target for tests and local checks.

## Best next steps you can implement immediately
1. Create one shared API helper module and replace the repeated fetch code.
2. Add a small global error banner or toast system for failed requests.
3. Add a loading spinner for book, chapter, and portal screens.
4. Refactor the portal reader into smaller functions with clearer state updates.
5. Add one test for portal creation and one for note update.
6. Replace the current startup DB creation flow with migration-based setup.

## Suggested implementation order
1. Frontend API centralization
2. Loading/error UX improvements
3. Backend validation and cleaner structure
4. Database safety and migrations
5. Tests and automation

## Bottom line
The project is already usable, but it is still a prototype. The biggest gains will come from reducing hidden complexity, making failures visible, and adding basic safeguards around the API and database. If you implement the first three priorities, the app will become much easier to maintain and extend.
