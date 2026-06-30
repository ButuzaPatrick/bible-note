from fastapi import APIRouter, Depends # type: ignore
from sqlmodel import Session, select
from database import get_session

from models.note import Note
from models.highlight import Highlight

from models.verse import Verse

router = APIRouter()

@router.get("/search/{query}")
def search(query: str, translation: str = "ESV", session: Session = Depends(get_session)):
    search_term = f"%{query}%"

    matching_verses = session.exec(
        select(Verse).where(
            Verse.text.ilike(search_term),
            Verse.translation == translation
        ).order_by(Verse.book, Verse.chapter, Verse.verse_number)
    ).all()

    matching_notes_raw = session.exec(
        select(Note, Highlight, Verse)
        .where(Note.content.ilike(search_term))
        .join(Highlight, Note.highlight_id == Highlight.id)
        .join(Verse, Highlight.verse_id == Verse.id)
    ).all()

    matching_notes = []
    for note, highlight, verse in matching_notes_raw:
        matching_notes.append({
            "note_id": note.id,
            "content": note.content,
            "highlight_id": highlight.id,
            "layer_id": highlight.layer_id,
            "verse": {
                "id": verse.id,
                "book": verse.book,
                "book_abbrev": verse.book_abbrev,
                "chapter": verse.chapter,
                "verse_number": verse.verse_number,
                "text": verse.text
            }
        })

    return {
        "query": query,
        "notes": matching_notes,
        "verses": matching_verses,
    }