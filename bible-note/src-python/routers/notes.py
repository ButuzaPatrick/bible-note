from fastapi import APIRouter, Depends, HTTPException  # type: ignore
from sqlmodel import Session
from database.init import get_session

from models.note import Note

from typing import Optional
from pydantic import BaseModel

router = APIRouter()


class NoteUpdate(BaseModel):
    """Payload for updating note content and saved UI position."""

    content: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None


@router.put("/notes/{note_id}")
def update_note(
    note_id: int, data: NoteUpdate, session: Session = Depends(get_session)
):
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if data.content is not None:
        note.content = data.content
    if data.x is not None:
        note.x = data.x
    if data.y is not None:
        note.y = data.y
    if data.width is not None:
        note.width = data.width
    if data.height is not None:
        note.height = data.height

    session.add(note)
    session.commit()
    session.refresh(note)
    return note
