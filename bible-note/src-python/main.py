from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from database import get_session, Verse, create_db

app = FastAPI()

# bypass CORS blocking policy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1430", "http://127.0.0.1:1430"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db()

@app.get("/ping")
def ping():
    return {"status": "ok"}

@app.get("/books")
def get_books(session: Session = Depends(get_session)):
    books = session.exec(select(Verse.book, Verse.book_abbrev).distinct()).all()
    return [{"book": b[0], "abbrev": b[1]} for b in books]

@app.get("/chapters/{book_abbrev}")
def get_chapters(book_abbrev: str, session: Session = Depends(get_session)):
    chapters = session.exec(
        select(Verse.chapter).where(Verse.book_abbrev == book_abbrev).distinct()
    ).all()
    return sorted(chapters)

@app.get("/verses/{book_abbrev}/{chapter}")
def get_verses(book_abbrev: str, chapter: int, session: Session = Depends(get_session)):
    verses = session.exec(
        select(Verse).where(
            Verse.book_abbrev == book_abbrev,
            Verse.chapter == chapter,
        ).order_by(Verse.verse_number)
    ).all()
    return verses