from sqlmodel import SQLModel, Field, create_engine, Session
from typing import Optional

DATABASE_URL = "sqlite:///bible_note.db"
engine = create_engine(DATABASE_URL)

# Verse data
class Verse(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    book: str
    book_abbrev: str
    chapter: int
    verse_number: int
    text: str

# To save portal data
class Portal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    book: str
    book_abbrev: str
    chapter_start: int
    verse_start: Optional[int] = None
    chapter_end: Optional[int] = None
    verse_end: Optional[int] = None

def create_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session