import os
import re
import tempfile
from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Query, Depends
from services.auth import get_current_user
from services.database import get_user_meta
from pydantic import BaseModel
from typing import Optional

from services.database import (
    listar_criativos, adicionar_criativo, get_criativo,
    atualizar_copy, atualizar_meta_copy, atualizar_url,
    aprovar_criativo, marcar_subido, rejeitar_criativo, deletar_criativo,
)
from services.gemini import gerar_copy, gerar_copy_meta
from services.storage import upload_file, download_to_temp, delete_file

router = APIRouter(prefix="/creatives", tags=["Criativos"])


def clean_filename(filename: str) -> str:
    name = os.path.splitext(filename)[0]
    for termo in ["allu-ads-", "vert", "stories", "v1", "v2", "_v1", "_v2", "_V1", "_V2"]:
        name = re.sub(re.escape(termo), "", name, flags=re.IGNORECASE)
    name = re.sub(r"[_\-\s]+", "_", name).strip("_")
    prefix = "VD" if filename.lower().endswith((".mp4", ".mov", ".avi")) else "IMG"
    return f"{prefix}_{name}"


def safe_filename(filename: str) -> str:
    import unicodedata
    ext = os.path.splitext(filename)[1]
    name = os.path.splitext(filename)[0]
    normalized = unicodedata.normalize("NFKD", name)
    ascii_name = "".join(c for c in normalized if ord(c) < 128)
    ascii_name = re.sub(r"[^\w\-]", "_", ascii_name).strip("_") or "arquivo"
    return ascii_name + ext


# ── List ─────────────────────────────────────────────────────────────────────

@router.get("/")
def listar(platform: str = Query(default=None)):
    return listar_criativos(platform)


# ── Upload ───────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    platform: str = Query(default="tiktok", pattern="^(tiktok|meta)$"),
):
    blob_name = safe_filename(file.filename)
    contents = await file.read()
    with tempfile.NamedTemporaryFile(suffix=os.path.splitext(blob_name)[1], delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name
    try:
        upload_file(tmp_path, blob_name)
    finally:
        os.remove(tmp_path)
    nome_criativo = clean_filename(file.filename)
    card = adicionar_criativo(blob_name, nome_criativo, platform=platform)
    background_tasks.add_task(_gerar_copy_task, blob_name, card["id"], platform)
    return {"message": f"{file.filename} adicionado.", "card": card}


def _gerar_copy_task(blob_name: str, card_id: int, platform: str = "tiktok"):
    temp_media = None
    temp_ctx = None
    try:
        temp_media = download_to_temp(blob_name)
        from routers.settings import _load as _load_settings
        settings = _load_settings()
        exemplos = settings.get("reference_copies", [])
        ctx_blob = settings.get("context_file")
        context_path = None
        if ctx_blob:
            temp_ctx = download_to_temp(ctx_blob)
            context_path = temp_ctx
        historico = [c["copy"] for c in listar_criativos() if c.get("status") == "OK" and c.get("copy")]
        if platform == "meta":
            result = gerar_copy_meta(temp_media, historico=historico, exemplos=exemplos, context_path=context_path)
            atualizar_meta_copy(card_id, result["primary_text"], result["headline"], result["description"])
        else:
            copy = gerar_copy(temp_media, historico=historico, exemplos=exemplos, context_path=context_path)
            atualizar_copy(card_id, copy)
    except Exception as e:
        import traceback; traceback.print_exc()
        msg = f"ERRO IA: {e}"
        atualizar_copy(card_id, msg)
        if platform == "meta":
            atualizar_meta_copy(card_id, msg, "", "")
    finally:
        for tmp in [temp_media, temp_ctx]:
            if tmp and os.path.exists(tmp):
                os.remove(tmp)


# ── Update copy (manual) ─────────────────────────────────────────────────────

class UpdateCopyPayload(BaseModel):
    copy: str


@router.post("/update-copy/{card_id}")
def update_copy_endpoint(card_id: int, payload: UpdateCopyPayload):
    if not get_criativo(card_id):
        raise HTTPException(status_code=404, detail="Card nao encontrado.")
    atualizar_copy(card_id, payload.copy)
    return {"message": f"Copy do card {card_id} atualizada."}


# ── Generate copy on demand ──────────────────────────────────────────────────

@router.post("/generate-copy/{card_id}")
def generate_copy(
    card_id: int,
    background_tasks: BackgroundTasks,
    platform: str = Query(default="tiktok", pattern="^(tiktok|meta)$"),
):
    card = get_criativo(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card nao encontrado.")
    if platform == "tiktok":
        atualizar_copy(card_id, "Gerando copy...")
    background_tasks.add_task(_gerar_copy_task, card["arquivo"], card_id, platform)
    return {"message": f"Gerando copy ({platform}) em background."}


# ── Approve ──────────────────────────────────────────────────────────────────

class AprovarPayload(BaseModel):
    url: str
    copy: Optional[str] = None
    meta_primary_text: Optional[str] = None
    meta_headline: Optional[str] = None
    meta_description: Optional[str] = None


@router.post("/aprovar/{card_id}")
def aprovar(card_id: int, payload: AprovarPayload):
    if not get_criativo(card_id):
        raise HTTPException(status_code=404, detail="Card nao encontrado.")
    aprovar_criativo(
        card_id, payload.url, payload.copy,
        payload.meta_primary_text, payload.meta_headline, payload.meta_description,
    )
    return {"message": f"Card {card_id} aprovado."}


# ── Reject ───────────────────────────────────────────────────────────────────

@router.post("/rejeitar/{card_id}")
def rejeitar(card_id: int):
    if not get_criativo(card_id):
        raise HTTPException(status_code=404, detail="Card nao encontrado.")
    rejeitar_criativo(card_id)
    return {"message": f"Card {card_id} rejeitado."}


# ── Publish ──────────────────────────────────────────────────────────────────

class PublicarPayload(BaseModel):
    use_utm: bool = False
    platform: str = "tiktok"
    adset_ids: list[str] = []
    page_id: Optional[str] = None


@router.post("/subido/{card_id}")
def subido(card_id: int, payload: PublicarPayload = PublicarPayload(), email: str = Depends(get_current_user)):
    card = get_criativo(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card nao encontrado.")

    from routers.settings import _load as _load_settings
    settings = _load_settings()

    final_url = card.get("url") or ""
    if payload.use_utm:
        utm_key = "utm_meta" if payload.platform == "meta" else "utm_tiktok"
        utm_pattern = settings.get(utm_key, "")
        if utm_pattern:
            base_url = final_url.rstrip("&?")
            separator = "&" if "?" in base_url else "?"
            final_url = f"{base_url}{separator}{utm_pattern.lstrip('?&')}"
            atualizar_url(card_id, final_url)

    meta_result = None
    if payload.platform == "meta" and payload.adset_ids and payload.page_id:
        from services.meta_publisher import publish_creative
        user_meta = get_user_meta(email)
        token = user_meta["meta_api_key"]
        ad_account_id = user_meta["meta_ad_account_id"]
        if not token or not ad_account_id:
            raise HTTPException(status_code=400, detail="Token ou conta Meta nao configurados.")

        temp_file = None
        try:
            temp_file = download_to_temp(card["arquivo"])
            meta_result = publish_creative(
                token=token,
                ad_account_id=ad_account_id,
                page_id=payload.page_id,
                adset_ids=payload.adset_ids,
                url=final_url,
                primary_text=card.get("meta_primary_text") or "",
                headline=card.get("meta_headline") or "",
                description=card.get("meta_description") or "",
                file_path=temp_file,
                ad_name=card.get("nome_criativo") or f"Ad_{card_id}",
            )
        except RuntimeError as e:
            raise HTTPException(status_code=502, detail=str(e))
        finally:
            if temp_file and os.path.exists(temp_file):
                os.remove(temp_file)

        if not meta_result["ads"] and meta_result["errors"]:
            raise HTTPException(status_code=502, detail=meta_result["errors"][0]["error"])

    marcar_subido(card_id)
    response = {"message": f"Card {card_id} publicado."}
    if meta_result:
        response["meta"] = meta_result
    return response


# ── Delete ───────────────────────────────────────────────────────────────────

@router.delete("/{card_id}")
def deletar(card_id: int):
    card = get_criativo(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card nao encontrado.")
    delete_file(card["arquivo"])
    deletar_criativo(card_id)
    return {"message": f"Card {card_id} deletado."}
