from fastapi import FastAPI, Depends, HTTPException # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from sqlmodel import Session, select
from database import get_session, Verse, Portal, Layer, Highlight, Note, create_db
from typing import Optional
from pydantic import BaseModel

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
def get_books(translation: str = "ESV", session: Session = Depends(get_session)):
    books = session.exec(
        select(Verse.book, Verse.book_abbrev)
        .where(Verse.translation == translation)
        .distinct()
    ).all()
    return [{"book": b[0], "abbrev": b[1]} for b in books]

@app.get("/chapters/{book_abbrev}")
def get_chapters(book_abbrev: str, translation: str = "ESV", session: Session = Depends(get_session)):
    chapters = session.exec(
        select(Verse.chapter)
        .where(Verse.book_abbrev == book_abbrev, Verse.translation == translation)
        .distinct()
    ).all()
    return sorted(chapters)

@app.get("/verses/{book_abbrev}/{chapter}")
def get_verses(book_abbrev: str, chapter: int, translation: str = "ESV", session: Session = Depends(get_session)):
    verses = session.exec(
        select(Verse).where(
            Verse.book_abbrev == book_abbrev,
            Verse.chapter == chapter,
            Verse.translation == translation
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
def get_portal_verses(portal_id: int, translation: str = "ESV", session: Session = Depends(get_session)):
    portal = session.get(Portal, portal_id)
    if not portal:
        raise HTTPException(status_code=404, detail="Portal not found")

    chapter_end = portal.chapter_end or portal.chapter_start
    verse_start = portal.verse_start
    verse_end = portal.verse_end

    verses = session.exec(
        select(Verse).where(
            Verse.book_abbrev == portal.book_abbrev,
            Verse.translation == translation,
            Verse.chapter >= portal.chapter_start,
            Verse.chapter <= chapter_end
        ).order_by(Verse.chapter, Verse.verse_number)
    ).all()

    def in_range(v):
        if v.chapter == portal.chapter_start and verse_start:
            if v.verse_number < verse_start:
                return False
        if v.chapter == chapter_end and verse_end:
            if v.verse_number > verse_end:
                return False
        return True

    return [v for v in verses if in_range(v)]

# LAYERS

class LayerCreate(BaseModel):
    title: Optional[str] = None
    colour: Optional[str] = "#ffdc6a"
    order: Optional[int] = 0

@app.get("/portals/{portal_id}/layers")
def get_layers(portal_id: int, session: Session = Depends(get_session)):
    return session.exec(
        select(Layer).where(Layer.portal_id == portal_id).order_by(Layer.order)
    ).all()

@app.post("/portals/{portal_id}/layers")
def create_layer(portal_id: int, data: LayerCreate, session: Session = Depends(get_session)):
    layer = Layer(portal_id=portal_id, **data.model_dump())
    session.add(layer)
    session.commit()
    session.refresh(layer)
    return layer

@app.delete("/layers/{layer_id}")
def delete_layer(layer_id: int, session: Session = Depends(get_session)):
    layer = session.get(Layer, layer_id)
    if not layer:
        raise HTTPException(status_code=404, detail="Layer not found")
    
    highlights = session.exec(select(Highlight).where(Highlight.layer_id == layer_id)).all()
    for highlight in highlights:
        note = session.exec(select(Note).where(Note.highlight_id == highlight.id)).first()
        if note:
            session.delete(note)
        session.delete(highlight)
    
    session.delete(layer)
    session.commit()
    return {"ok": True}

# HIGHLIGHTS

class HighlightCreate(BaseModel):
    verse_id: int
    start_offset: Optional[int] = None
    end_offset: Optional[int] = None
    full_verse: bool = False
    mouse_x: Optional[float] = None
    mouse_y: Optional[float] = None

@app.get("/layers/{layer_id}/highlights")
def get_highlights(layer_id: int, session: Session = Depends(get_session)):
    highlights = session.exec(
        select(Highlight).where(Highlight.layer_id == layer_id)
    ).all()
    
    result = []
    for highlight in highlights:
        note = session.exec(
            select(Note).where(Note.highlight_id == highlight.id)
        ).first()
        result.append(
            {**highlight.model_dump(), "note": note.model_dump() if note else None}
        )
    return result

@app.post("/layers/{layer_id}/highlights")
def create_highlight(layer_id: int, data: HighlightCreate, session: Session = Depends(get_session)):
    payload = data.model_dump()
    print(payload)
    highlight = Highlight(layer_id=layer_id, **payload)
    session.add(highlight)
    session.commit()
    session.refresh(highlight)
    note = Note(highlight_id=highlight.id, content="", x=payload.get("mouse_x") or 1200, y=payload.get("mouse_y") or 100)
    session.add(note)
    session.commit()
    session.refresh(note)
    return {
        "id": highlight.id,
        "layer_id": highlight.layer_id,
        "verse_id": highlight.verse_id,
        "start_offset": highlight.start_offset,
        "end_offset": highlight.end_offset,
        "full_verse": highlight.full_verse,
        "note": note.model_dump()
    }

@app.delete("/highlights/{highlight_id}")
def delete_highlight(highlight_id: int, session: Session = Depends(get_session)):
    highlight = session.get(Highlight, highlight_id)
    print("deleting highlight")
    if not highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    note = session.exec(
        select(Note).where(Note.highlight_id == highlight.id)
        ).first()
    if note:
        session.delete(note)
    session.delete(highlight)
    session.commit()
    return { "ok": True }

# NOTES

class NoteUpdate(BaseModel):
    content: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None

@app.put("/notes/{note_id}")
def update_note(note_id: int, data: NoteUpdate, session: Session = Depends(get_session)):
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if data.content is not None:
        note.content = data.content
    if data.x is not None:
        note.x = data.x
    if data.y is not None:
        note.y = data.y
    
    session.add(note)
    session.commit()
    session.refresh(note)
    return note