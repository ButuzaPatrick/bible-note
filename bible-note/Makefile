app:
	npm run tauri dev

server:
	venv\Scripts\uvicorn.exe main:app --port 8000 --reload --app-dir src-python

tidy:
	@echo "formating..."
	venv/Scripts/ruff format .
	@echo "formating complete"
	@echo "linting..."
	venv/Scripts/ruff check .

db-migrate:
	venv/Scripts/alembic revision --autogenerate -m "$(message)"
	venv/Scripts/alembic upgrade head

db-upgrade:
	venv/Scripts/alembic upgrade head

db-revision:
	venv/Scripts/alembic revision --autogenerate -m "$(msg)"