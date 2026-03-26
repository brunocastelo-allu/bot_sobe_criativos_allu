import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from services.database import criar_usuario, get_usuario_por_email, atualizar_senha_hash
from services.auth import hash_password, verify_password, create_token, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])

_DOMAIN = "allugator.com"


class RegisterPayload(BaseModel):
    email: str
    password: str
    nome: str = ""


class LoginPayload(BaseModel):
    email: str
    password: str


@router.post("/register")
def register(payload: RegisterPayload):
    email = payload.email.strip().lower()
    logger.info(f"[register] tentativa: {email}")
    if not email.endswith(f"@{_DOMAIN}"):
        raise HTTPException(status_code=403, detail=f"Apenas emails @{_DOMAIN} são permitidos.")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Senha deve ter pelo menos 8 caracteres.")
    logger.info("[register] conectando ao banco...")
    if get_usuario_por_email(email):
        raise HTTPException(status_code=409, detail="Email já cadastrado.")
    criar_usuario(email, hash_password(payload.password), payload.nome.strip())
    logger.info("[register] conta criada com sucesso")
    return {"message": "Conta criada com sucesso."}


@router.post("/login")
def login(payload: LoginPayload):
    email = payload.email.strip().lower()
    user = get_usuario_por_email(email)
    if not user or not verify_password(payload.password, user["senha_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos.")
    return {
        "access_token": create_token(email),
        "token_type": "bearer",
        "nome": user.get("nome", ""),
    }


@router.get("/me")
def me(email: str = Depends(get_current_user)):
    user = get_usuario_por_email(email)
    return {"email": email, "nome": user.get("nome", "") if user else ""}


class ChangePasswordPayload(BaseModel):
    old_password: str
    new_password: str


@router.post("/change-password")
def change_password(payload: ChangePasswordPayload, email: str = Depends(get_current_user)):
    user = get_usuario_por_email(email)
    if not user or not verify_password(payload.old_password, user["senha_hash"]):
        raise HTTPException(status_code=401, detail="Senha atual incorreta.")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Nova senha deve ter pelo menos 8 caracteres.")
    atualizar_senha_hash(email, hash_password(payload.new_password))
    return {"message": "Senha alterada com sucesso."}
