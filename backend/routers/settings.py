import os
import json
import hmac as _hmac
import hashlib
import base64
import time
import tempfile
import urllib.parse
import urllib.request
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from services.database import (
    get_settings_db, save_settings_db,
    get_user_meta, save_user_meta_token, save_user_meta_account, clear_user_meta,
)
from services.auth import get_current_user

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

META_APP_ID     = os.environ.get("META_APP_ID", "")
META_APP_SECRET  = os.environ.get("META_APP_SECRET", "")
META_REDIRECT_URI = os.environ.get("META_REDIRECT_URI", "http://localhost:8000/settings/meta/callback")
_META_SCOPES     = "ads_management,ads_read"
_SECRET_KEY      = os.environ.get("SECRET_KEY", "")


def _make_oauth_state(email: str) -> str:
    payload = json.dumps({"e": email, "t": int(time.time())})
    sig = _hmac.new(_SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()[:24]
    return base64.urlsafe_b64encode((payload + "|" + sig).encode()).decode()


def _parse_oauth_state(state: str) -> str:
    try:
        decoded = base64.urlsafe_b64decode(state + "==").decode()
        idx = decoded.rfind("|")
        payload, sig = decoded[:idx], decoded[idx + 1:]
        expected = _hmac.new(_SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()[:24]
        if not _hmac.compare_digest(sig, expected):
            raise ValueError("assinatura inválida")
        data = json.loads(payload)
        if time.time() - data["t"] > 600:
            raise ValueError("expirado")
        return data["e"]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(400, "OAuth state inválido")

router = APIRouter(prefix="/settings", tags=["Settings"])
public_router = APIRouter(prefix="/settings", tags=["Settings Public"])


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
def get_settings(email: str = Depends(get_current_user)):
    data = _load()
    user_meta = get_user_meta(email)
    data["meta_api_key"] = user_meta["meta_api_key"]
    data["meta_ad_account_id"] = user_meta["meta_ad_account_id"]
    return data


@router.post("/")
def save_settings(data: SettingsPayload, email: str = Depends(get_current_user)):
    settings = _load()
    settings.update({k: v for k, v in data.model_dump().items()
                     if k not in ("meta_api_key", "meta_ad_account_id")})
    _save(settings)
    if data.meta_ad_account_id:
        save_user_meta_account(email, data.meta_ad_account_id)
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

@router.get("/meta/login-url")
def meta_login_url(email: str = Depends(get_current_user)):
    if not META_APP_ID:
        raise HTTPException(status_code=400, detail="META_APP_ID não configurado.")
    state = _make_oauth_state(email)
    params = urllib.parse.urlencode({
        "client_id": META_APP_ID,
        "redirect_uri": META_REDIRECT_URI,
        "scope": _META_SCOPES,
        "response_type": "code",
        "state": state,
    })
    return {"url": f"https://www.facebook.com/v21.0/dialog/oauth?{params}"}


@public_router.get("/meta/callback")
def meta_oauth_callback(code: str = None, state: str = None, error: str = None, error_description: str = None):
    if error or not code:
        return HTMLResponse(_oauth_html(False, error_description or error or "Acesso negado"))
    try:
        email = _parse_oauth_state(state or "")
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
        save_user_meta_token(email, long_token)
        return HTMLResponse(_oauth_html(True))
    except Exception as e:
        return HTMLResponse(_oauth_html(False, str(e)))


@router.delete("/meta/token")
def meta_disconnect(email: str = Depends(get_current_user)):
    clear_user_meta(email)
    return {"message": "Meta desconectado."}


def _oauth_html(success: bool, error: str = "") -> str:
    msg = json.dumps({"type": "meta_oauth", "success": success, "error": error})
    body = "Conectado! Esta janela vai fechar..." if success else f"Erro: {error}"
    return f"""<!DOCTYPE html><html><head><title>Meta Login</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0f2f5">
<p style="font-size:16px;color:{'#1877F2' if success else '#d32f2f'}">{body}</p>
<script>try{{window.opener.postMessage({msg},'*');}}catch(e){{}}setTimeout(function(){{window.close();}},1200);</script>
</body></html>"""
