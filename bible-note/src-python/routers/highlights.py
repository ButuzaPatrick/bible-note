from fastapi import APIRouter, Depends, HTTPException # type: ignore
from sqlmodel import Session, select
from database.init import get_session

from models.note import Note
from models.highlight import Highlight

from typing import Optional
from pydantic import BaseModel

router = APIRouter()

class HighlightCreate(BaseModel):
    """Payload for creating a highlight and its initial note position."""
    verse_id: int
    start_offset: Optional[int] = None
    end_offset: Optional[int] = None
    full_verse: bool = False
    mouse_x: Optional[float] = None
    mouse_y: Optional[float] = None

@router.get("/layers/{layer_id}/highlights")
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

@router.post("/layers/{layer_id}/highlights")
def create_highlight(layer_id: int, data: HighlightCreate, session: Session = Depends(get_session)):
    payload = data.model_dump()
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

@router.delete("/highlights/{highlight_id}")
def delete_highlight(highlight_id: int, session: Session = Depends(get_session)):
    highlight = session.get(Highlight, highlight_id)
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