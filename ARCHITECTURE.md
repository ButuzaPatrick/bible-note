# Architecture

Tauri (shell)  
  ├── WebView (HTML + Tailwind + Vanilla JS)  
  │     └── talks to Python via HTTP (localhost)  
  └── Python Sidecar (FastAPI)  
        └── SQLite DB  