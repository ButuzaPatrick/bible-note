from sqlmodel import SQLModel, Field, create_engine, Session
from typing import Optional

class Verse(SQLModel, table=True):
    """A single verse from the Bible text database."""
    id: Optional[int] = Field(default=None, primary_key=True)
    book: str
    book_abbrev: str
    chapter: int
    verse_number: int
    text: str
    translation: str = "ESV"