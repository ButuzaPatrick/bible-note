from fastapi import APIRouter, Depends, HTTPException # type: ignore
from sqlmodel import Session, select
from database.init import get_session

from models.note import Note
from models.layer import Layer
from models.highlight import Highlight

from typing import Optional
from pydantic import BaseModel

router = APIRouter()

class LayerCreate(BaseModel):
    """Payload for creating a layer."""
    title: Optional[str] = None
    colour: Optional[str] = "#ffdc6a"
    order: Optional[int] = 0

@router.get("/portals/{portal_id}/layers")
def get_layers(portal_id: int, session: Session = Depends(get_session)):
    return session.exec(
        select(Layer).where(Layer.portal_id == portal_id).order_by(Layer.order)
    ).all()

@router.post("/portals/{portal_id}/layers")
def create_layer(portal_id: int, data: LayerCreate, session: Session = Depends(get_session)):
    layer = Layer(portal_id=portal_id, **data.model_dump())
    session.add(layer)
    session.commit()
    session.refresh(layer)
    return layer

@router.delete("/layers/{layer_id}")
def delete_layer(layer_id: int, session: Session = Depends(get_session)):
    layer = session.get(Layer, layer_id)
    if not layer:
        raise HTTPException(status_code=404, detail="Layer not found")
    
    highlights = session.exec(select(Highlight).where(Highlight.layer_id == layer_id)).all()
    for highlight in highlights:
        note = session.exec(select(Note).where(Note.highlight_id == highlight.id)).first()
        if note:
            session.delete(note)
        session.delete(highlight)
    
    session.delete(layer)
    session.commit()
    return {"ok": True}