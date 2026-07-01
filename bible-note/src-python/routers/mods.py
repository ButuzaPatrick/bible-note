from mod_loader import get_all_mods, run_mod_backend
from fastapi.responses import FileResponse  # type: ignore
from fastapi import APIRouter, HTTPException  # type: ignore
import os
from mod_loader import get_mods_folder_fp

router = APIRouter()

MODS_DIR = get_mods_folder_fp()


@router.get("/mods")
def list_mods():
    return get_all_mods()


@router.get("/mods/{mod_id}/panel")
def get_mod_panel(mod_id: str):
    path = os.path.join(MODS_DIR, mod_id, "panel.html")
    print("Looking for panel at:", os.path.abspath(path))
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="No panel for this mod")
    return FileResponse(path)


@router.post("/mods/{mod_id}/run")
def run_mod(mod_id: str, book: str = None, chapter: int = None):
    func = run_mod_backend(mod_id)

    if not func:
        raise HTTPException(status_code=400, detail="Mod has no run() function")

    kwargs = {}
    if book is not None:
        kwargs["book"] = book
    if chapter is not None:
        kwargs["chapter"] = chapter

    result = func(**kwargs)

    result = func(**kwargs)
    return {"result": result}
