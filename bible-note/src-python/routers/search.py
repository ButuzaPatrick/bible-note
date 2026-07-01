from fastapi import APIRouter, Depends  # type: ignore
from sqlmodel import Session, select
from database.init import get_session

from models.note import Note
from models.highlight import Highlight
from models.layer import Layer

from models.verse import Verse

router = APIRouter()


@router.get("/search/{query}")
def search(
    query: str, translation: str = "ESV", session: Session = Depends(get_session)
):
    search_term = f"%{query}%"

    matching_verses = session.exec(
        select(Verse)
        .where(Verse.text.ilike(search_term), Verse.translation == translation)
        .order_by(Verse.book, Verse.chapter, Verse.verse_number)
    ).all()

    matching_notes_raw = session.exec(
        select(Note, Highlight, Verse)
        .where(Note.content.ilike(search_term))
        .join(Highlight, Note.highlight_id == Highlight.id)
        .join(Verse, Highlight.verse_id == Verse.id)
    ).all()
    
    print(matching_notes_raw)
    
    # Get notes from layers with matching names (regardless of note content)
    layer_notes = session.exec(
        select(Note, Highlight, Verse, Layer)
        .join(Highlight, Note.highlight_id == Highlight.id)
        .join(Verse, Highlight.verse_id == Verse.id)
        .join(Layer, Highlight.layer_id == Layer.id)
        .where(Layer.title.ilike(search_term))
    ).all()

    # Get notes with matching content (regardless of layer name)
    content_notes = session.exec(
        select(Note, Highlight, Verse, Layer)
        .where(Note.content.ilike(search_term))
        .join(Highlight, Note.highlight_id == Highlight.id)
        .join(Verse, Highlight.verse_id == Verse.id)
        .join(Layer, Highlight.layer_id == Layer.id)
    ).all()

    # Combine both results
    matching_notes_raw = layer_notes + content_notes
    
    print(matching_notes_raw)

    matching_notes = []
    for note, highlight, verse, layer in matching_notes_raw:
        matching_notes.append(
            {
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
                    "text": verse.text,
                },
                "layer_title": layer.title,
            }
        )

    return {
        "query": query,
        "notes": matching_notes,
        "verses": matching_verses,
    }
