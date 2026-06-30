from fastapi import APIRouter, Depends  # type: ignore
from sqlmodel import Session, select
from database.init import get_session
import requests
from bs4 import BeautifulSoup

from models.verse import Verse

router = APIRouter()


@router.get("/commentary/{book}/{chapter}")
def get_commentary(book: str, chapter: int, session: Session = Depends(get_session)):
    verse = session.exec(
        select(Verse).where(Verse.book_abbrev == book, Verse.chapter == chapter)
    ).first()
    book_name = verse.book if verse else book

    url = f"https://enduringword.com/bible-commentary/{book.lower()}-{chapter}/"
    headers = {"User-Agent": "Mozilla/5.0"}

    response = requests.get(url, headers=headers)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    paragraphs = soup.find_all("p")

    p_text = []
    for p in paragraphs:
        if "AI" not in str(p):
            p_text.append(str(p))

    content = (
        "<br>".join(p_text)
        + f'SOURCE: <a href="{url}">The Enduring Word - {book} {chapter}</a>'
    )

    return {
        "book": book_name,
        "chapter": chapter,
        "content": content,
    }
