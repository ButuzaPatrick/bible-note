app:
	npm run tauri dev

server:
	venv\Scripts\uvicorn.exe main:app --port 8000 --reload --app-dir src-python

tidy:
	@echo "formating..."
	ruff format .
	@echo "formating complete"
	@echo "linting..."
	ruff check .