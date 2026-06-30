from fastapi import APIRouter, Depends # type: ignore
from sqlmodel import Session, select
from database.init import get_session

from models.verse import Verse

router = APIRouter()

@router.get("/books")
def get_books(translation: str = "ESV", session: Session = Depends(get_session)):
    books = session.exec(
        select(Verse.book, Verse.book_abbrev)
        .where(Verse.translation == translation)
        .distinct()
    ).all()
    return [{"book": b[0], "abbrev": b[1]} for b in books]

@router.get("/chapters/{book_abbrev}")
def get_chapters(book_abbrev: str, translation: str = "ESV", session: Session = Depends(get_session)):
    chapters = session.exec(
        select(Verse.chapter)
        .where(Verse.book_abbrev == book_abbrev, Verse.translation == translation)
        .distinct()
    ).all()
    return sorted(chapters)

@router.get("/verses/{book_abbrev}/{chapter}")
def get_verses(book_abbrev: str, chapter: int, translation: str = "ESV", session: Session = Depends(get_session)):
    verses = session.exec(
        select(Verse).where(
            Verse.book_abbrev == book_abbrev,
            Verse.chapter == chapter,
            Verse.translation == translation
        ).order_by(Verse.verse_number)
    ).all()
    return verses