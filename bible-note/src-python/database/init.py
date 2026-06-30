from sqlmodel import SQLModel, create_engine, Session
from typing import Iterator

DATABASE_URL = "sqlite:///bible_note.db"
engine = create_engine(DATABASE_URL)


def create_db() -> None:
    """Create all database tables if they do not already exist"""
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    """Yield a database session for request-scoped use"""
    with Session(engine) as session:
        yield session
