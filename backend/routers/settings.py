import os
import json
import tempfile
import urllib.parse
import urllib.request
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from services.database import get_settings_db, save_settings_db

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

META_APP_ID = os.environ.get("META_APP_ID", "")
META_APP_SECRET = os.environ.get("META_APP_SECRET", "")
META_REDIRECT_URI = os.environ.get("META_REDIRECT_URI", "http://localhost:8000/settings/meta/callback")
_META_SCOPES = "ads_management,ads_read,pages_manage_ads,pages_read_engagement"

router = APIRouter(prefix="/settings", tags=["Settings"])


def _load() -> dict:
    return get_settings_db()


def _save(data: dict):
    save_settings_db(data)


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
    _save(settings)
    return {"message": "Configuracoes salvas."}


@router.post("/context-file")
async def upload_context_file(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".pdf", ".txt"):
        raise HTTPException(status_code=400, detail="Apenas PDF ou TXT sao suportados.")
    contents = await file.read()
    blob_name = f"context/context{ext}"
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name
    try:
        from services.storage import upload_file
        upload_file(tmp_path, blob_name)
    finally:
        os.remove(tmp_path)
    settings = _load()
    settings["context_file"] = blob_name
    settings["context_file_name"] = file.filename
    _save(settings)
    return {"message": "Arquivo de contexto salvo.", "filename": file.filename}


@router.delete("/context-file")
def delete_context_file():
    settings = _load()
    blob = settings.get("context_file")
    if blob:
        from services.storage import delete_file
        delete_file(blob)
    settings["context_file"] = None
    settings["context_file_name"] = None
    _save(settings)
    return {"message": "Arquivo de contexto removido."}


# ── Meta OAuth ─────────────────────────────────────────────────────────────────

@router.get("/meta/login")
def meta_oauth_login():
    if not META_APP_ID:
        raise HTTPException(status_code=400, detail="META_APP_ID não configurado no .env")
    params = urllib.parse.urlencode({
        "client_id": META_APP_ID,
        "redirect_uri": META_REDIRECT_URI,
        "scope": _META_SCOPES,
        "response_type": "code",
    })
    return RedirectResponse(f"https://www.facebook.com/v21.0/dialog/oauth?{params}")


@router.get("/meta/callback")
def meta_oauth_callback(code: str = None, error: str = None, error_description: str = None):
    if error or not code:
        return HTMLResponse(_oauth_html(False, error_description or error or "Acesso negado"))
    try:
        token_url = "https://graph.facebook.com/v21.0/oauth/access_token"
        p1 = urllib.parse.urlencode({
            "client_id": META_APP_ID, "client_secret": META_APP_SECRET,
            "redirect_uri": META_REDIRECT_URI, "code": code,
        })
        with urllib.request.urlopen(f"{token_url}?{p1}") as r:
            short_token = json.loads(r.read())["access_token"]
        p2 = urllib.parse.urlencode({
            "grant_type": "fb_exchange_token",
            "client_id": META_APP_ID, "client_secret": META_APP_SECRET,
            "fb_exchange_token": short_token,
        })
        with urllib.request.urlopen(f"{token_url}?{p2}") as r:
            long_token = json.loads(r.read()).get("access_token", short_token)
        settings = _load()
        settings["meta_api_key"] = long_token
        _save(settings)
        return HTMLResponse(_oauth_html(True))
    except Exception as e:
        return HTMLResponse(_oauth_html(False, str(e)))


@router.delete("/meta/token")
def meta_disconnect():
    settings = _load()
    settings["meta_api_key"] = ""
    _save(settings)
    return {"message": "Meta desconectado."}


def _oauth_html(success: bool, error: str = "") -> str:
    msg = json.dumps({"type": "meta_oauth", "success": success, "error": error})
    body = "Conectado! Esta janela vai fechar..." if success else f"Erro: {error}"
    return f"""<!DOCTYPE html><html><head><title>Meta Login</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0f2f5">
<p style="font-size:16px;color:{'#1877F2' if success else '#d32f2f'}">{body}</p>
<script>try{{window.opener.postMessage({msg},'*');}}catch(e){{}}setTimeout(function(){{window.close();}},1200);</script>
</body></html>"""
