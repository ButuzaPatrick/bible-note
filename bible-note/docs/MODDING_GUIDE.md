# Modding Guide for Bible Note

This project already supports a simple mod system for three kinds of extensions:

- panel mods: add content to the app's panel area
- importer mods: run one-time import logic
- theme mods: apply custom CSS variable values

The implementation lives in the mods folder, the Python loader, and the frontend mod UI.

## How the current mod system works

A mod is a folder inside the mods directory. Each mod folder should contain:

- mod.json: manifest describing the mod
- main.py: backend logic that the Python loader runs
- optional panel.html: frontend content for panel-style mods

The loader discovers mods by scanning each subfolder in the mods directory and reading its mod.json.

### Supported manifest fields

The current manifest uses fields like:

- id: unique lowercase identifier
- name: display name
- version: version string
- type: one of panel, importer, or theme
- entry: optional frontend entry file
- backend: optional backend file name
- description: human-readable summary

Example:

```json
{
  "id": "matthew-henry",
  "name": "Matthew Henry",
  "version": "1.0.0",
  "type": "panel",
  "entry": "panel.html",
  "backend": "main.py",
  "description": "Matthew Henry's commentary panel"
}
```

## How to use existing mods

1. Place a mod folder inside the mods directory.
2. Make sure it contains a valid mod.json file.
3. Restart or reload the app so the backend discovers it.
4. Open the mod UI to see the installed mods.

The frontend calls:

- GET /mods to list available mods
- GET /mods/{mod_id}/panel to fetch panel content
- POST /mods/{mod_id}/run to execute the mod backend

## How to create a simple panel mod

### 1. Create a new folder

Example:

```text
mods/my-panel-mod/
```

### 2. Add a manifest

Create mods/my-panel-mod/mod.json:

```json
{
  "id": "my-panel-mod",
  "name": "My Panel Mod",
  "version": "1.0.0",
  "type": "panel",
  "entry": "panel.html",
  "backend": "main.py",
  "description": "Shows a custom panel in the app"
}
```

### 3. Add backend logic

Create mods/my-panel-mod/main.py:

```python
def run(book=None, chapter=None):
    return "Hello from my mod"
```

### 4. Add optional panel content

Create mods/my-panel-mod/panel.html:

```html
<div>
  <h3>My Panel Mod</h3>
  <p>This content can be shown in the panel UI.</p>
</div>
```

The backend function must be named run(). That is the entry point the loader uses.

## How to create a theme mod

Theme mods are very simple. They return a dictionary of CSS custom properties.

Example:

```python
def run(book=None, chapter=None):
    return {
        "--bg": "#101813",
        "--surface": "#161f19",
        "--surface2": "#1f2b23",
        "--border": "#2c3a30",
        "--text": "#d8e6db",
        "--text-muted": "#7f9588",
        "--accent": "#6fae66"
    }
```

Use the manifest type value:

```json
{
  "id": "my-theme",
  "name": "My Theme",
  "version": "1.0.0",
  "type": "theme",
  "backend": "main.py",
  "description": "Applies a custom color scheme"
}
```

## How to create an importer mod

Importer mods are intended for one-time data-loading actions. They should perform work when run and return a success or failure message.

Example:

```python
def run(book=None, chapter=None):
    # do import work here
    return "Import complete"
```

Use the manifest type value:

```json
{
  "id": "my-importer",
  "name": "My Importer",
  "version": "1.0.0",
  "type": "importer",
  "backend": "main.py",
  "description": "Imports data into the app"
}
```

## Current limitations

The mod system is intentionally lightweight, but it has some important limitations:

- it only discovers folders under the mods directory
- it expects a main.py file with a run() function
- it does not currently validate manifests strongly
- it has no built-in permissions or sandboxing model
- it does not provide a rich plugin API or configuration UI
- it is mostly suited to simple UI and data-loading extensions

## Suggestions to improve modding capabilities

Here are practical ways to make the system more powerful and developer-friendly:

### 1. Add a richer plugin API

Introduce a formal API for hooks such as:

- onVerseOpen
- onThemeChange
- onSearch
- onNoteCreated
- onPanelRender

This would let mods respond to app events instead of only running manually.

### 2. Add manifest validation

Validate mod.json before loading it. This could catch missing fields, invalid types, and duplicate IDs early.

### 3. Support settings and configuration

Allow each mod to define configurable options such as:

- API endpoints
- toggle switches
- text fields
- color choices

These settings could be stored in app settings and exposed in the UI.

### 4. Add sandboxing and safety checks

Because mods may run Python code, it would be helpful to add:

- isolated execution environments
- permissions for network access
- timeout limits
- logging and error reporting

### 5. Improve packaging and installation

Support installing mods from a zip archive or a package directory. A simple install flow would make distribution much easier.

### 6. Add hot reloading during development

Allow mods to reload automatically when their files change. That would make iteration much faster for mod authors.

### 7. Add better documentation and examples

Create a starter template repository or example mods for:

- a commentary panel
- a translation importer
- a custom theme
- a search enhancement

### 8. Expand the UI model

Support richer mod surfaces such as:

- dedicated pages
- sidebars
- toolbars
- floating widgets
- context-menu actions

### 9. Improve error handling

Show friendly messages when a mod fails and include debug logs, stack traces, and a way to disable a broken mod.

### 10. Support dependency management

If a mod needs extra Python packages, let it declare them in its manifest or a requirements file so setup is more repeatable.

## Recommended starting pattern

For a first mod, the best approach is usually:

1. create a simple panel or theme mod
2. keep the backend logic small and deterministic
3. return clear data or UI content
4. test it in isolation before expanding features

That keeps the mod system approachable while still leaving room for more advanced extensions later.
