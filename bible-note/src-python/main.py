from fastapi import FastAPI  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from database.init import create_db

from routers.portals import router as portal_router
from routers.layers import router as layer_router
from routers.highlights import router as highlight_router
from routers.notes import router as note_router
from routers.search import router as search_router
from routers.commentary import router as commentary_router
from routers.sermons import router as sermon_router
from routers.read import router as read_router

app = FastAPI()

# bypass CORS blocking policy
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1430",
        "http://127.0.0.1:1430",
        "http://localhost:8000",
        "tauri://localhost",
    ],
    allow_methods=["GET", "PUT", "POST", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(portal_router)
app.include_router(layer_router)
app.include_router(highlight_router)
app.include_router(note_router)
app.include_router(search_router)
app.include_router(commentary_router)
app.include_router(sermon_router)
app.include_router(read_router)


@app.on_event("startup")
def on_startup():
    create_db()


@app.get("/ping")
def ping():
    return {"status": "ok"}
