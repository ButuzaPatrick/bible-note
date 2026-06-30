from sqlmodel import SQLModel, Field
from typing import Optional


class Layer(SQLModel, table=True):
    """A named grouping of highlights, used like a note layer."""

    id: Optional[int] = Field(default=None, primary_key=True)
    portal_id: int = Field(foreign_key="portal.id")
    title: Optional[str] = None
    colour: str = "#ffdc6a"
    order: int = 0
