from sqlmodel import SQLModel, Field, create_engine, Session
from typing import Optional, Iterator

DATABASE_URL = "sqlite:///bible_note.db"
engine = create_engine(DATABASE_URL)

class Verse(SQLModel, table=True):
    """A single verse from the Bible text database."""
    id: Optional[int] = Field(default=None, primary_key=True)
    book: str
    book_abbrev: str
    chapter: int
    verse_number: int
    text: str
    translation: str = "ESV"

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

class Layer(SQLModel, table=True):
    """A named grouping of highlights, used like a note layer."""
    id: Optional[int] = Field(default=None, primary_key=True)
    portal_id: int = Field(foreign_key="portal.id")
    title: Optional[str] = None
    colour: str = "#ffdc6a"
    order: int = 0

class Highlight(SQLModel, table=True):
    """A highlight attached to a verse and a layer."""
    id: Optional[int] = Field(default=None, primary_key=True)
    layer_id: int = Field(foreign_key="layer.id")
    verse_id: int = Field(foreign_key="verse.id")
    start_offset: Optional[int] = None
    end_offset: Optional[int] = None
    full_verse: bool = False

class Note(SQLModel, table=True):
    """A note box attached to a highlight, with saved UI position."""
    id: Optional[int] = Field(default=None, primary_key=True)
    highlight_id: int = Field(foreign_key="highlight.id")
    content: str = ""
    x: float = 1200
    y: float = 100

def create_db() -> None:
    """Create all database tables if they do not already exist."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    """Yield a database session for request-scoped use."""
    with Session(engine) as session:
        yield session