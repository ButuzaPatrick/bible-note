from sqlmodel import SQLModel, Field, create_engine, Session
from typing import Optional


class Highlight(SQLModel, table=True):
    """A highlight attached to a verse and a layer."""

    id: Optional[int] = Field(default=None, primary_key=True)
    layer_id: int = Field(foreign_key="layer.id")
    verse_id: int = Field(foreign_key="verse.id")
    start_offset: Optional[int] = None
    end_offset: Optional[int] = None
    full_verse: bool = False
