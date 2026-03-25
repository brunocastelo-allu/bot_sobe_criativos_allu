from fastapi import APIRouter

router = APIRouter(prefix="/tiktok", tags=["TikTok"])

_MOCK_CAMPAIGNS = [
    {
        "id": "camp_tt_1",
        "name": "Campanha Cartao - Conversao",
        "adsets": [
            {"id": "adset_tt_1_1", "name": "Adset 18-35 Lookalike"},
            {"id": "adset_tt_1_2", "name": "Adset Interesse Fintech"},
        ],
    },
    {
        "id": "camp_tt_2",
        "name": "Campanha Conta Digital - Alcance",
        "adsets": [
            {"id": "adset_tt_2_1", "name": "Adset Retargeting Site"},
            {"id": "adset_tt_2_2", "name": "Adset Broad 25-45"},
        ],
    },
]


@router.get("/status")
def status_api():
    return {"configurado": False, "mensagem": "Aguardando aprovacao do app TikTok."}


@router.get("/campanhas")
def listar_campanhas():
    return _MOCK_CAMPAIGNS
