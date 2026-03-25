import os
import json
from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel

router = APIRouter(prefix="/settings", tags=["Settings"])

SETTINGS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "settings.json")
CONTEXT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "context")

_DEFAULTS = {
    "email": "",
    "tiktok_api_key": "",
    "meta_api_key": "",
    "meta_ad_account_id": "",
    "reference_copies": [],
    "context_file": None,
    "context_file_name": None,
    "utm_tiktok": "utm_source=tiktok&utm_medium=cpc&utm_campaign=__CAMPAIGN_NAME__&utm_content=__AID_NAME__",
    "utm_meta": "utm_source=facebook&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content={{ad.name}}",
}


def _load():
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE) as f:
            data = json.load(f)
        # Ensure new keys exist for old settings files
        for k, v in _DEFAULTS.items():
            data.setdefault(k, v)
        return data
    return dict(_DEFAULTS)


class SettingsPayload(BaseModel):
    email: str = ""
    tiktok_api_key: str = ""
    meta_api_key: str = ""
    meta_ad_account_id: str = ""
    reference_copies: list[str] = []
    utm_tiktok: str = ""
    utm_meta: str = ""


@router.get("/")
def get_settings():
    return _load()


@router.post("/")
def save_settings(data: SettingsPayload):
    settings = _load()
    settings.update(data.model_dump())
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings, f, indent=2)
    return {"message": "Configuracoes salvas."}


@router.post("/context-file")
async def upload_context_file(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".pdf", ".txt"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Apenas PDF ou TXT sao suportados.")
    os.makedirs(CONTEXT_DIR, exist_ok=True)
    dest = os.path.join(CONTEXT_DIR, f"context{ext}")
    contents = await file.read()
    with open(dest, "wb") as f:
        f.write(contents)
    settings = _load()
    settings["context_file"] = dest
    settings["context_file_name"] = file.filename
    with open(SETTINGS_FILE, "w") as sf:
        json.dump(settings, sf, indent=2)
    return {"message": "Arquivo de contexto salvo.", "filename": file.filename}


@router.delete("/context-file")
def delete_context_file():
    settings = _load()
    path = settings.get("context_file")
    if path and os.path.exists(path):
        os.remove(path)
    settings["context_file"] = None
    settings["context_file_name"] = None
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings, f, indent=2)
    return {"message": "Arquivo de contexto removido."}
