# Portal Reader Function Inventory

This document lists the functions currently defined in [src/portal_reader.js](../src/portal_reader.js) and groups them by responsibility so the file can be split into smaller modules more cleanly.

## 1. App bootstrap and state setup

These functions initialize the page and manage global state.

- `setPortalState(nextPortal)`
  - Updates the current portal object and title UI.
- `setLayersState(nextLayers)`
  - Replaces the layer list state and re-renders the layer UI.
- `setActiveLayerState(nextLayer)`
  - Updates the active layer and re-renders layer-related content.
- `setHighlightsState(nextHighlights)`
  - Replaces the highlight/note state and re-renders the highlights and notes UI.
- `clearLayerContent()`
  - Clears both highlight rendering and note rendering.
- `init()`
  - Main startup flow: loads portal data, verses, layers, toolbars, and prefetches content.
- `applyTheme(modId)`
  - Applies a theme mod by calling the backend and setting CSS variables.

Suggested split target:
- `portal-state.js` or `app-init.js`

## 2. Layer management

These functions handle creating, selecting, editing, deleting, and saving layers.

- `openDeleteLayerModal(event, id, title)`
- `closeDeleteLayerModal()`
- `confirmDeleteLayer()`
- `loadLayers()`
- `renderLayers()`
- `startEditingLayer(event, layerId, currentTitle)`
- `handleLayerEditKey(event, layerId)`
- `finishEditingLayer(event, layerId, original)`
- `setActiveLayer(layer)`
- `renderLayerContent()`
- `deleteLayer(event, id)`
- `openLayerModal()`
- `closeLayerModal()`
- `bindColourSwatches()`
- `saveLayer()`

Suggested split target:
- `layers.js`

## 3. Verse highlighting and annotation

These functions are responsible for creating highlights, rendering them in the verse list, and managing note UI.

- `setupHighlighting()`
- `addHighlightToState(highlight)`
- `clearHighlightsUI()`
- `applyHighlightToVerse(highlight)`
- `rebuildPartialHighlights(verseId)`
- `appendNote(highlight)`
- `renderHighlights()`
- `clearNotesUI()`
- `renderNotes()`
- `updateNoteInState(noteId, patch)`
- `pulseHighlight(highlight)`
- `saveNote(noteId, content)`
- `deleteHighlight(highlightId)`

Suggested split target:
- `highlights-notes.js`

## 4. Note positioning and interaction

These functions support dragging and resizing note boxes.

- `makeDraggable(el, noteId)`
- `makeResizable(el, noteId)`

Suggested split target:
- `notes-interaction.js`

## 5. Portal verse rendering

These functions render the scripture content and cache verse text for later highlighting.

- `loadVerses()`
- `renderVerses(verses)`
- `cacheVerseText()`

Suggested split target:
- `verses.js`

## 6. Sidebar and tool panel behaviour

These handle the sidebar UI and the tool-panel experience.

- `setupSidebarBehaviour()`
- `toggleTool(tool)`
- `loadModPanel(modId)`
- `closeTool()`

Suggested split target:
- `tool-panel.js`

## 7. Commentary, sermons, and search

These functions load content into the tool panel and support search results.

- `prefetchCommentary()`
- `prefetchSermons()`
- `loadCommentary()`
- `loadSermons()`
- `renderSermonsHtml(videos)`
- `setupSermonsScrollTracking()`
- `setupCommentaryScrollTracking()`
- `loadSearch()`
- `runPanelSearch(query)`
- `highlightMatch(text, query)`
- `goToSearchResult(bookAbbrev, chapter)`

Suggested split target:
- `content-panels.js`

## 8. Toolbelt / mod buttons

These functions build the toolbelt UI and add built-in or plugin buttons.

- `loadToolbeltButtons()`

Suggested split target:
- `toolbelt.js`

## 9. Helper / utility-style functions

These are smaller support functions that do not fit neatly into a single domain.

- `clearLayerContent()`
- `applyTheme(modId)`
- `highlightMatch(text, query)`

## Suggested module breakdown for refactoring

A practical split could look like this:

1. `app-init.js`
   - state setup, bootstrap, startup flow
2. `layers.js`
   - layer CRUD and UI state
3. `verses.js`
   - verse loading and rendering
4. `highlights-notes.js`
   - highlights, notes, selection behaviour, rendering
5. `notes-interaction.js`
   - dragging and resizing notes
6. `tool-panel.js`
   - sidebar, tool toggling, mod iframe loading
7. `content-panels.js`
   - commentary, sermons, search, scroll tracking
8. `toolbelt.js`
   - dynamic buttons in the toolbelt

## Notes for the split

A few shared values are currently used across many functions:

- `portal`
- `layers`
- `activeLayer`
- `highlights`
- `selectedColour`
- `verseTextCache`
- `mouse_x` / `mouse_y`
- `commentaryCache` / `sermonsCache`

These would likely need to be moved into a shared state module or passed through a small app context object during the refactor.
