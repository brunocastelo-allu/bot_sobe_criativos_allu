import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS creatives (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                arquivo             TEXT NOT NULL,
                nome_criativo       TEXT,
                platform            TEXT DEFAULT 'tiktok',
                copy                TEXT DEFAULT 'Gerando copy...',
                copy_aprovada       INTEGER DEFAULT 0,
                url                 TEXT DEFAULT '',
                status              TEXT DEFAULT 'AGUARDANDO APROVAÇÃO',
                meta_primary_text   TEXT DEFAULT '',
                meta_headline       TEXT DEFAULT '',
                meta_description    TEXT DEFAULT '',
                created_at          TEXT DEFAULT (datetime('now'))
            )
        """)
        # Migrate existing DBs
        for col, typedef in [
            ("platform",           "TEXT DEFAULT 'tiktok'"),
            ("meta_primary_text",  "TEXT DEFAULT ''"),
            ("meta_headline",      "TEXT DEFAULT ''"),
            ("meta_description",   "TEXT DEFAULT ''"),
        ]:
            try:
                conn.execute(f"ALTER TABLE creatives ADD COLUMN {col} {typedef}")
            except sqlite3.OperationalError:
                pass
        conn.commit()


def _row_to_dict(row):
    d = {k: row[k] for k in row.keys()}
    d["copy_aprovada"] = bool(d.get("copy_aprovada", 0))
    return d


def listar_criativos(platform: str = None):
    with get_conn() as conn:
        if platform:
            rows = conn.execute("SELECT * FROM creatives WHERE platform = ? ORDER BY id ASC", (platform,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM creatives ORDER BY id ASC").fetchall()
        return [_row_to_dict(r) for r in rows]


def adicionar_criativo(arquivo: str, nome_criativo: str, copy: str = "Gerando copy...", platform: str = "tiktok") -> dict:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO creatives (arquivo, nome_criativo, copy, platform) VALUES (?, ?, ?, ?)",
            (arquivo, nome_criativo, copy, platform),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM creatives WHERE id = ?", (cur.lastrowid,)).fetchone()
        return _row_to_dict(row)


def get_criativo(id_: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM creatives WHERE id = ?", (id_,)).fetchone()
        return _row_to_dict(row) if row else None


def atualizar_copy(id_: int, copy: str):
    with get_conn() as conn:
        conn.execute("UPDATE creatives SET copy = ? WHERE id = ?", (copy, id_))
        conn.commit()


def atualizar_meta_copy(id_: int, primary_text: str, headline: str, description: str):
    with get_conn() as conn:
        conn.execute(
            "UPDATE creatives SET meta_primary_text = ?, meta_headline = ?, meta_description = ? WHERE id = ?",
            (primary_text, headline, description, id_),
        )
        conn.commit()


def atualizar_url(id_: int, url: str):
    with get_conn() as conn:
        conn.execute("UPDATE creatives SET url = ? WHERE id = ?", (url, id_))
        conn.commit()


def atualizar_status(id_: int, status: str):
    with get_conn() as conn:
        conn.execute("UPDATE creatives SET status = ? WHERE id = ?", (status, id_))
        conn.commit()


def aprovar_criativo(id_: int, url: str, copy: str = None,
                     meta_primary_text: str = None, meta_headline: str = None, meta_description: str = None):
    with get_conn() as conn:
        fields = "copy_aprovada = 1, url = ?, status = 'AGUARDANDO UPLOAD'"
        params = [url]
        if copy is not None:
            fields += ", copy = ?"
            params.append(copy)
        if meta_primary_text is not None:
            fields += ", meta_primary_text = ?"
            params.append(meta_primary_text)
        if meta_headline is not None:
            fields += ", meta_headline = ?"
            params.append(meta_headline)
        if meta_description is not None:
            fields += ", meta_description = ?"
            params.append(meta_description)
        params.append(id_)
        conn.execute(f"UPDATE creatives SET {fields} WHERE id = ?", params)
        conn.commit()


def marcar_subido(id_: int):
    with get_conn() as conn:
        conn.execute("UPDATE creatives SET status = 'OK' WHERE id = ?", (id_,))
        conn.commit()


def rejeitar_criativo(id_: int):
    with get_conn() as conn:
        conn.execute("UPDATE creatives SET status = 'REJEITADO' WHERE id = ?", (id_,))
        conn.commit()


def deletar_criativo(id_: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM creatives WHERE id = ?", (id_,))
        conn.commit()
