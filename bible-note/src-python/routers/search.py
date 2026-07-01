from fastapi import APIRouter, Depends # type: ignore
from sqlmodel import Session, select, or_, and_
from database.init import get_session
from models.note import Note
from models.highlight import Highlight
from models.layer import Layer
from models.verse import Verse

router = APIRouter()

def split_query(query: str) -> list[str]:
    # Remove common stop words that add noise
    stop_words = {"and", "the", "a", "an", "of", "in", "to", "for", "is", "are", "was", "were", "with", "that", "this", "it", "be", "as", "at", "by", "or", "but"}
    words = query.lower().split()
    keywords = [w for w in words if w not in stop_words and len(w) > 2]
    # If filtering removed everything, just use all words
    return keywords if keywords else words

@router.get("/search/{query}")
def search(
    query: str, translation: str = "ESV", session: Session = Depends(get_session)
):
    keywords = split_query(query)

    # Get all verses that match ANY keyword
    keyword_conditions = [Verse.text.ilike(f"%{kw}%") for kw in keywords]
    
    candidate_verses = session.exec(
        select(Verse)
        .where(
            or_(*keyword_conditions),
            Verse.translation == translation
        )
        .order_by(Verse.book, Verse.chapter, Verse.verse_number)
    ).all()

    # Score each verse by how many keywords it contains
    def score_verse(verse):
        text_lower = verse.text.lower()
        return sum(1 for kw in keywords if kw in text_lower)

    # Sort by score descending, filter out weak matches (less than half the keywords)
    min_score = max(1, len(keywords) // 2)
    scored_verses = [
        (v, score_verse(v)) for v in candidate_verses
        if score_verse(v) >= min_score
    ]
    scored_verses.sort(key=lambda x: x[1], reverse=True)
    matching_verses = [v for v, s in scored_verses]

    # Notes — same keyword approach
    keyword_note_conditions = [Note.content.ilike(f"%{kw}%") for kw in keywords]
    keyword_layer_conditions = [Layer.title.ilike(f"%{kw}%") for kw in keywords]

    content_notes = session.exec(
        select(Note, Highlight, Verse, Layer)
        .where(or_(*keyword_note_conditions))
        .join(Highlight, Note.highlight_id == Highlight.id)
        .join(Verse, Highlight.verse_id == Verse.id)
        .join(Layer, Highlight.layer_id == Layer.id)
    ).all()

    layer_notes = session.exec(
        select(Note, Highlight, Verse, Layer)
        .join(Highlight, Note.highlight_id == Highlight.id)
        .join(Verse, Highlight.verse_id == Verse.id)
        .join(Layer, Highlight.layer_id == Layer.id)
        .where(or_(*keyword_layer_conditions))
    ).all()

    # Deduplicate by note id
    seen_note_ids = set()
    matching_notes = []
    for note, highlight, verse, layer in content_notes + layer_notes:
        if note.id in seen_note_ids:
            continue
        seen_note_ids.add(note.id)
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
                "text": verse.text,
            },
            "layer_title": layer.title,
        })

    return {
        "query": query,
        "notes": matching_notes,
        "verses": matching_verses,
    }