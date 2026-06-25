from fastapi import FastAPI, Depends, HTTPException # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from sqlmodel import Session, select
from database import get_session, Verse, Portal, create_db
from typing import Optional
from pydantic import BaseModel

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

# PORTALS

# BaseModel validates the incoming data
class PortalCreate(BaseModel):
    title: str
    book: str
    book_abbrev: str
    chapter_start: int
    verse_start: Optional[int] = None
    chapter_end: Optional[int] = None
    verse_end: Optional[int] = None

@app.get("/portals")
def get_portals(session: Session = Depends(get_session)):
    return session.exec(select(Portal)).all()

@app.get("/portals/{portal_id}")
def get_portal(portal_id: int, session: Session = Depends(get_session)):
    portal = session.get(Portal, portal_id)
    if not portal:
        raise HTTPException(status_code=404, detail="Portal not found")
    return portal

@app.post("/portals")
def create_portal(data: PortalCreate, session: Session = Depends(get_session)):
    # ** unpacks all the json data individually and model_dump passes each line in json as key=value parameter to Portal class
    portal = Portal(**data.model_dump())
    session.add(portal)
    session.commit()
    session.refresh(portal)
    return portal

@app.delete("/portals/{portal_id}")
def delete_portal(portal_id: int, session: Session = Depends(get_session)):
    portal = session.get(Portal, portal_id)
    if not portal:
        raise HTTPException(status_code=404, detail="Portal not found")
    session.delete(portal)
    session.commit()
    return {"ok": True}

@app.get("/portals/{portal_id}/verses")
def get_portal_verses(portal_id: int, session: Session = Depends(get_session)):
    portal = session.get(Portal, portal_id)
    if not portal:
        raise HTTPException(status_code=404, detail="Portal not found")
    
    query = select(Verse).where(Verse.book_abbrev == portal.book_abbrev)
    
    chapter_end = portal.chapter_end or portal.chapter_start
    verse_end = portal.verse_end
    verse_start = portal.verse_start
    
    # gets all verses within those chapters
    verses = session.exec(
        query.where(
            Verse.chapter >= portal.chapter_start,
            Verse.chapter <= chapter_end
        ).order_by(Verse.chapter, Verse.verse_number)
    ).all()
    
    def in_range(verse):
        if verse.chapter == portal.chapter_start and verse_start:
            if verse.verse_number < verse_start:
                return False
        if verse.chapter == chapter_end and verse_end:
            if verse.verse_number > verse_end:
                return False
        return True
    
    return [verse for verse in verses if in_range(verse)]
