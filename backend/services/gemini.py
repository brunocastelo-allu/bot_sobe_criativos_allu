import json
import os
import re
import time
from dotenv import load_dotenv
from google import genai

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

_RULES_GLOBAL = """
Regras obrigatórias:
- NÃO use emojis (zero emojis).
- Escreva "allu" sempre em letras minúsculas.
- Baseie-se no conteúdo real do criativo, nunca invente contexto.
- Tom: urgente, direto, vantajoso — faz o usuário querer abrir a conta agora.
"""

_BRAND_CONTEXT = """
SOBRE A ALLU: banco digital B2C com zero anuidade, cashback real no cartão de crédito e rendimento automático do saldo. Público-alvo: brasileiros que querem um banco sem taxas abusivas e que faz o dinheiro render.
"""


_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"]


def _get_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY não configurada.")
    return genai.Client(api_key=api_key)


def _generate(client, contents):
    last_err = None
    for model in _MODELS:
        for attempt in range(2):
            try:
                return client.models.generate_content(model=model, contents=contents)
            except Exception as e:
                last_err = e
                if "503" in str(e) or "UNAVAILABLE" in str(e):
                    time.sleep(3)
                else:
                    raise
    raise last_err


def _upload_and_wait(client, path: str):
    import unicodedata, shutil, tempfile
    try:
        os.path.basename(path).encode("ascii")
        safe_path = path
    except UnicodeEncodeError:
        ext = os.path.splitext(path)[1]
        normalized = unicodedata.normalize("NFKD", os.path.splitext(os.path.basename(path))[0])
        safe_name = "".join(c for c in normalized if ord(c) < 128) or "arquivo"
        tmp = tempfile.NamedTemporaryFile(suffix=ext, prefix=safe_name + "_", delete=False)
        tmp.close()
        shutil.copy2(path, tmp.name)
        safe_path = tmp.name

    try:
        f = client.files.upload(file=safe_path)
        while f.state.name == "PROCESSING":
            time.sleep(2)
            f = client.files.get(name=f.name)
        return f
    finally:
        if safe_path != path and os.path.exists(safe_path):
            os.remove(safe_path)


def _build_contents(client, media_path: str, context_path: str = None):
    contents = []
    if context_path and os.path.exists(context_path):
        if context_path.endswith(".txt"):
            with open(context_path, "r", encoding="utf-8") as cf:
                contents.append(f"--- DOCUMENTO DE CONTEXTO ---\n{cf.read()}\n--- FIM ---\n")
        else:
            contents.append(_upload_and_wait(client, context_path))
    contents.append(_upload_and_wait(client, media_path))
    return contents


def _clean_copy(text: str, max_len: int = 120) -> str:
    text = text.strip().replace('"', '').replace('\n', ' ')
    text = re.sub(r'[^\w\s\.,!?@#&$%/áàãéêíóôõúçÁÀÃÉÊÍÓÔÕÚÇ\-]', '', text)
    if len(text) > max_len:
        truncated = text[:max_len]
        last_space = truncated.rfind(' ')
        text = truncated[:last_space] if last_space > 0 else truncated
    return text.strip()


# ── TikTok copy (single field, max 100 chars) ────────────────────────────────

def gerar_copy(media_path: str, historico: list = None, exemplos: list = None, context_path: str = None) -> str:
    client = _get_client()
    contents = _build_contents(client, media_path, context_path)

    prompt = f"""Você é um Copywriter Especialista Sênior (Direct Response) focado em Growth Ads para a 'allu'.
{_BRAND_CONTEXT}
Analise o criativo e escreva uma copy COMPLETA para TikTok Ads:
- EXATAMENTE entre 80 e 120 caracteres. Nunca ultrapasse 120.
- A copy deve ter início, meio e fim — frase completa, sem cortes ou reticências.
- Destaque UM diferencial da allu relevante para o criativo (zero anuidade, cashback, rendimento, facilidade de abrir conta).
{_RULES_GLOBAL}"""

    if exemplos:
        prompt += "\n--- EXEMPLOS DE REFERÊNCIA (siga esse estilo): ---\n" + "".join(f'✓ "{e}"\n' for e in exemplos)
    if historico:
        prompt += "\n--- COPIES RECENTES APROVADAS: ---\n" + "".join(f'- "{e}"\n' for e in historico[-5:])

    prompt += "\nRetorne APENAS o texto da copy. Sem aspas, marcadores ou introduções."
    contents.append(prompt)

    resp = _generate(client, contents)
    return _clean_copy(resp.text, 120)


# ── Meta copy (3 fields) ─────────────────────────────────────────────────────

def gerar_copy_meta(media_path: str, historico: list = None, exemplos: list = None, context_path: str = None) -> dict:
    """Returns dict with primary_text (125 chars), headline (40 chars), description (30 chars)."""
    client = _get_client()
    contents = _build_contents(client, media_path, context_path)

    prompt = f"""Você é um Copywriter Especialista Sênior (Direct Response) focado em Growth Ads para a 'allu'.
{_BRAND_CONTEXT}
Analise o criativo e escreva os 3 textos para Meta Ads (Facebook/Instagram):

1. primary_text: Texto principal do anúncio. Máximo 125 caracteres. Foco na dor/solução B2C.
2. headline: Título curto. Máximo 40 caracteres. Foco no benefício principal ou oferta.
3. description: Descrição complementar. Máximo 30 caracteres. Gatilhos como "Sem anuidade", "Abra gratis".
{_RULES_GLOBAL}"""

    if exemplos:
        prompt += "\n--- EXEMPLOS DE REFERÊNCIA: ---\n" + "".join(f'✓ "{e}"\n' for e in exemplos)
    if historico:
        prompt += "\n--- COPIES RECENTES APROVADAS: ---\n" + "".join(f'- "{e}"\n' for e in historico[-5:])

    prompt += '\nRetorne APENAS um JSON válido, sem markdown:\n{"primary_text": "...", "headline": "...", "description": "..."}'
    contents.append(prompt)

    resp = _generate(client, contents)
    raw = re.sub(r"^```[a-z]*\n?", "", resp.text.strip()).rstrip("```").strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        pt = re.search(r'"primary_text"\s*:\s*"([^"]*)"', raw)
        hl = re.search(r'"headline"\s*:\s*"([^"]*)"', raw)
        ds = re.search(r'"description"\s*:\s*"([^"]*)"', raw)
        data = {
            "primary_text": pt.group(1) if pt else "",
            "headline":     hl.group(1) if hl else "",
            "description":  ds.group(1) if ds else "",
        }

    return {
        "primary_text": _clean_copy(data.get("primary_text", ""), 125),
        "headline":     _clean_copy(data.get("headline", ""),      40),
        "description":  _clean_copy(data.get("description", ""),   30),
    }
