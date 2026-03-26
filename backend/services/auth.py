import os
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from dotenv import load_dotenv
from jose import JWTError, jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

_SECRET = os.environ.get("SECRET_KEY", "allu_secret_mude_em_producao")
_ALGO = "HS256"
_EXPIRE_HOURS = 8

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000)
    return f"{salt}:{key.hex()}"


def verify_password(plain: str, hashed: str) -> bool:
    # New format: "salt:hexkey" (pbkdf2_hmac)
    if ":" in hashed:
        try:
            salt, key_hex = hashed.split(":", 1)
            key = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt.encode(), 260000)
            return hmac.compare_digest(key.hex(), key_hex)
        except Exception:
            return False
    # Legacy bcrypt format
    try:
        import bcrypt as _bcrypt
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def create_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=_EXPIRE_HOURS)
    return jwt.encode({"sub": email, "exp": expire}, _SECRET, algorithm=_ALGO)


def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = jwt.decode(token, _SECRET, algorithms=[_ALGO])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Token inválido.")
        return email
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")
