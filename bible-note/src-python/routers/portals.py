from fastapi import APIRouter, Depends, HTTPException  # type: ignore
from sqlmodel import Session, select
from database.init import get_session

from models.verse import Verse
from models.portal import Portal

from typing import Optional
from pydantic import BaseModel

router = APIRouter()


# BaseModel validates the incoming data
class PortalCreate(BaseModel):
    """Payload for creating a reading portal."""

    title: str
    book: str
    book_abbrev: str
    chapter_start: int
    verse_start: Optional[int] = None
    chapter_end: Optional[int] = None
    verse_end: Optional[int] = None

class PortalUpdate(BaseModel):
    title: Optional[str] = None

@router.get("/portals")
def get_portals(session: Session = Depends(get_session)):
    return list(reversed(session.exec(select(Portal)).all()))

@router.get("/portals/{portal_id}")
def get_portal(portal_id: int, session: Session = Depends(get_session)):
    portal = session.get(Portal, portal_id)
    if not portal:
        raise HTTPException(status_code=404, detail="Portal not found")
    return portal

@router.post("/portals")
def create_portal(data: PortalCreate, session: Session = Depends(get_session)):
    # ** unpacks all the json data individually and model_dump passes each line in json as key=value parameter to Portal class
    portal = Portal(**data.model_dump())
    session.add(portal)
    session.commit()
    session.refresh(portal)
    return portal

@router.put("/portals/{portal_id}")
def update_portal(portal_id: int, data: PortalUpdate, session: Session = Depends(get_session)):
    portal = session.get(Portal, portal_id)
    if not portal:
        raise HTTPException(status_code=404, detail="Portal not found")
    if data.title is not None:
        portal.title = data.title
    
    session.add(portal)
    session.commit()
    session.refresh(portal)
    return portal

@router.delete("/portals/{portal_id}")
def delete_portal(portal_id: int, session: Session = Depends(get_session)):
    portal = session.get(Portal, portal_id)
    if not portal:
        raise HTTPException(status_code=404, detail="Portal not found")
    session.delete(portal)
    session.commit()
    return {"ok": True}


@router.get("/portals/{portal_id}/verses")
def get_portal_verses(
    portal_id: int, translation: str = "ESV", session: Session = Depends(get_session)
):
    portal = session.get(Portal, portal_id)
    if not portal:
        raise HTTPException(status_code=404, detail="Portal not found")

    chapter_end = portal.chapter_end or portal.chapter_start
    verse_start = portal.verse_start
    verse_end = portal.verse_end

    verses = session.exec(
        select(Verse)
        .where(
            Verse.book_abbrev == portal.book_abbrev,
            Verse.translation == translation,
            Verse.chapter >= portal.chapter_start,
            Verse.chapter <= chapter_end,
        )
        .order_by(Verse.chapter, Verse.verse_number)
    ).all()

    def in_range(v):
        if v.chapter == portal.chapter_start and verse_start:
            if v.verse_number < verse_start:
                return False
        if v.chapter == chapter_end and verse_end:
            if v.verse_number > verse_end:
                return False
        return True

    return [v for v in verses if in_range(v)]
