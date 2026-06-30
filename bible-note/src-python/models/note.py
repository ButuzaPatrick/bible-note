from sqlmodel import SQLModel, Field, create_engine, Session
from typing import Optional

class Note(SQLModel, table=True):
    """A note box attached to a highlight, with saved UI position."""
    id: Optional[int] = Field(default=None, primary_key=True)
    highlight_id: int = Field(foreign_key="highlight.id")
    content: str = ""
    x: float = 1200
    y: float = 100