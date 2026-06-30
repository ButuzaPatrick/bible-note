from sqlmodel import SQLModel, Field, create_engine, Session
from typing import Optional


class Portal(SQLModel, table=True):
    """A reading portal that spans a book/chapter/verse range."""

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    book: str
    book_abbrev: str
    chapter_start: int
    verse_start: Optional[int] = None
    chapter_end: Optional[int] = None
    verse_end: Optional[int] = None
