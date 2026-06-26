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
    translation: str = "ESV"

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

class Layer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    portal_id: int = Field(foreign_key="portal.id")
    title: Optional[str] = None
    colour: str = "#ffdc6a"
    order: int = 0

class Highlight(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    layer_id: int = Field(foreign_key="layer.id")
    verse_id: int = Field(foreign_key="verse.id")
    start_offset: Optional[int] = None
    end_offset: Optional[int] = None
    full_verse: bool = False

class Note(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    highlight_id: int = Field(foreign_key="highlight.id")
    content: str = ""
    x: float = 1200
    y: float = 100

def create_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session