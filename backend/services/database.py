import json
import os
import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

_DB_HOST = os.environ.get("DB_HOST", "")
_DB_PORT = int(os.environ.get("DB_PORT", "5432"))
_DB_NAME = os.environ.get("DB_NAME", "allu_ads")
_DB_USER = os.environ.get("DB_USER", "postgres")
_DB_PASSWORD = os.environ.get("DB_PASSWORD", "")

_SETTINGS_DEFAULTS = {
    "email": "",
    "tiktok_api_key": "",
    "meta_api_key": "",
    "meta_ad_account_id": "",
    "reference_copies": [],
    "context_file": None,
    "context_file_name": None,
    "utm_tiktok": "",
    "utm_meta": "",
}


@contextmanager
def get_db():
    conn = psycopg2.connect(
        host=_DB_HOST, port=_DB_PORT, dbname=_DB_NAME,
        user=_DB_USER, password=_DB_PASSWORD,
        connect_timeout=10,
    )
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id         SERIAL PRIMARY KEY,
                    email      TEXT NOT NULL UNIQUE,
                    senha_hash TEXT NOT NULL,
                    nome       TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS creatives (
                    id                SERIAL PRIMARY KEY,
                    arquivo           TEXT NOT NULL,
                    nome_criativo     TEXT,
                    platform          TEXT DEFAULT 'tiktok',
                    copy              TEXT DEFAULT 'Gerando copy...',
                    copy_aprovada     INTEGER DEFAULT 0,
                    url               TEXT DEFAULT '',
                    status            TEXT DEFAULT 'AGUARDANDO APROVAÇÃO',
                    meta_primary_text TEXT DEFAULT '',
                    meta_headline     TEXT DEFAULT '',
                    meta_description  TEXT DEFAULT '',
                    created_at        TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS settings (
                    id   INTEGER DEFAULT 1 PRIMARY KEY,
                    data JSONB NOT NULL DEFAULT '{}'
                )
            """)


def _row_to_dict(row):
    d = dict(row)
    d["copy_aprovada"] = bool(d.get("copy_aprovada", 0))
    return d


# ── Users ──────────────────────────────────────────────────────────────────────

def criar_usuario(email: str, senha_hash: str, nome: str = "") -> dict:
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO users (email, senha_hash, nome) VALUES (%s, %s, %s) RETURNING *",
                (email, senha_hash, nome),
            )
            return dict(cur.fetchone())


def get_usuario_por_email(email: str):
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
            return dict(row) if row else None


def atualizar_senha_hash(email: str, nova_hash: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET senha_hash = %s WHERE email = %s", (nova_hash, email))


# ── Creatives ──────────────────────────────────────────────────────────────────

def listar_criativos(platform: str = None):
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if platform:
                cur.execute("SELECT * FROM creatives WHERE platform = %s ORDER BY id ASC", (platform,))
            else:
                cur.execute("SELECT * FROM creatives ORDER BY id ASC")
            return [_row_to_dict(r) for r in cur.fetchall()]


def adicionar_criativo(arquivo: str, nome_criativo: str, copy: str = "Gerando copy...", platform: str = "tiktok") -> dict:
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO creatives (arquivo, nome_criativo, copy, platform) VALUES (%s, %s, %s, %s) RETURNING *",
                (arquivo, nome_criativo, copy, platform),
            )
            return _row_to_dict(cur.fetchone())


def get_criativo(id_: int):
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM creatives WHERE id = %s", (id_,))
            row = cur.fetchone()
            return _row_to_dict(row) if row else None


def atualizar_copy(id_: int, copy: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE creatives SET copy = %s WHERE id = %s", (copy, id_))


def atualizar_meta_copy(id_: int, primary_text: str, headline: str, description: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE creatives SET meta_primary_text = %s, meta_headline = %s, meta_description = %s WHERE id = %s",
                (primary_text, headline, description, id_),
            )


def atualizar_url(id_: int, url: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE creatives SET url = %s WHERE id = %s", (url, id_))


def atualizar_status(id_: int, status: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE creatives SET status = %s WHERE id = %s", (status, id_))


def aprovar_criativo(id_: int, url: str, copy: str = None,
                     meta_primary_text: str = None, meta_headline: str = None, meta_description: str = None):
    with get_db() as conn:
        with conn.cursor() as cur:
            fields = "copy_aprovada = 1, url = %s, status = 'AGUARDANDO UPLOAD'"
            params = [url]
            if copy is not None:
                fields += ", copy = %s"
                params.append(copy)
            if meta_primary_text is not None:
                fields += ", meta_primary_text = %s"
                params.append(meta_primary_text)
            if meta_headline is not None:
                fields += ", meta_headline = %s"
                params.append(meta_headline)
            if meta_description is not None:
                fields += ", meta_description = %s"
                params.append(meta_description)
            params.append(id_)
            cur.execute(f"UPDATE creatives SET {fields} WHERE id = %s", params)


def marcar_subido(id_: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE creatives SET status = 'OK' WHERE id = %s", (id_,))


def rejeitar_criativo(id_: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE creatives SET status = 'REJEITADO' WHERE id = %s", (id_,))


def deletar_criativo(id_: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM creatives WHERE id = %s", (id_,))


# ── Settings ───────────────────────────────────────────────────────────────────

def get_settings_db() -> dict:
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT data FROM settings WHERE id = 1")
            row = cur.fetchone()
            data = dict(row["data"]) if row else {}
            return {**_SETTINGS_DEFAULTS, **data}


def save_settings_db(data: dict):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO settings (id, data) VALUES (1, %s)
                ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
                """,
                (json.dumps(data),),
            )
