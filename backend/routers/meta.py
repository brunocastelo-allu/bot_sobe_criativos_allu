import json
import urllib.request
import urllib.error
from fastapi import APIRouter

router = APIRouter(prefix="/meta", tags=["Meta"])

_MOCK_CAMPAIGNS = [
    {
        "id": "camp_meta_1",
        "name": "Campanha Cartao - Conversao (Meta)",
        "adsets": [
            {"id": "adset_meta_1_1", "name": "Adset Lookalike 1% BR"},
            {"id": "adset_meta_1_2", "name": "Adset Interesse Banco Digital"},
        ],
    },
    {
        "id": "camp_meta_2",
        "name": "Campanha iPhone - Trafego (Meta)",
        "adsets": [
            {"id": "adset_meta_2_1", "name": "Adset Retargeting 30d"},
            {"id": "adset_meta_2_2", "name": "Adset Similar Clientes"},
        ],
    },
]

_MOCK_PAGES = [
    {"id": "page_meta_1", "name": "allu - Banco Digital"},
    {"id": "page_meta_2", "name": "allu no Instagram"},
]


def _load_settings():
    from routers.settings import _load
    return _load()


def _graph_get(path, token, extra=""):
    url = f"https://graph.facebook.com/v21.0/{path}?access_token={token}{extra}"
    try:
        r = urllib.request.urlopen(url, timeout=15)
        return json.loads(r.read()), None
    except urllib.error.HTTPError as e:
        return None, json.loads(e.read()).get("error", {})
    except Exception as e:
        return None, {"message": str(e)}


@router.get("/status")
def status_api():
    settings = _load_settings()
    token = settings.get("meta_api_key", "")
    if not token:
        return {"configurado": False, "mensagem": "Token nao configurado."}
    d, err = _graph_get("me", token)
    if err:
        return {"configurado": False, "mensagem": err.get("message", "Token invalido.")}
    account_id = settings.get("meta_ad_account_id", "")
    return {"configurado": bool(account_id), "mensagem": f"Conectado como {d.get('name')}"}


@router.get("/ad-accounts")
def listar_ad_accounts():
    settings = _load_settings()
    token = settings.get("meta_api_key", "")
    if not token:
        return []
    d, err = _graph_get("me/adaccounts", token, "&fields=id,name,account_status")
    if err or not d:
        return []
    return [
        {"id": a["id"], "name": a["name"]}
        for a in d.get("data", [])
        if a.get("account_status") == 1
    ]


@router.get("/campanhas")
def listar_campanhas():
    settings = _load_settings()
    token = settings.get("meta_api_key", "")
    ad_account_id = settings.get("meta_ad_account_id", "")

    if not token or not ad_account_id:
        return _MOCK_CAMPAIGNS

    d, err = _graph_get(
        f"{ad_account_id}/campaigns",
        token,
        "&fields=id,name,status&limit=100",
    )
    if err or not d:
        return _MOCK_CAMPAIGNS

    result = []
    for camp in d.get("data", []):
        adsets_d, _ = _graph_get(
            f"{camp['id']}/adsets",
            token,
            "&fields=id,name,status&limit=100",
        )
        adsets = [
            {"id": a["id"], "name": a["name"]}
            for a in (adsets_d or {}).get("data", [])
        ]
        result.append({
            "id": camp["id"],
            "name": camp["name"],
            "status": camp.get("status", ""),
            "adsets": adsets,
        })
    return result


@router.get("/pages")
def listar_pages():
    settings = _load_settings()
    token = settings.get("meta_api_key", "")
    if not token:
        return _MOCK_PAGES
    d, err = _graph_get("me/accounts", token, "&fields=id,name")
    if err or not d:
        return _MOCK_PAGES
    pages = [{"id": p["id"], "name": p["name"]} for p in d.get("data", [])]
    return pages if pages else _MOCK_PAGES
