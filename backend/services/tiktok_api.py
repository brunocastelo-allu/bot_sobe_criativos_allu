# TikTok Marketing API
# Será implementado após aprovação do app no TikTok Business API
# Documentação: https://business-api.tiktok.com/portal/docs

import os
from dotenv import load_dotenv

load_dotenv()

TIKTOK_APP_ID = os.environ.get("TIKTOK_APP_ID", "")
TIKTOK_SECRET = os.environ.get("TIKTOK_SECRET", "")
TIKTOK_ACCESS_TOKEN = os.environ.get("TIKTOK_ACCESS_TOKEN", "")
TIKTOK_ADVERTISER_ID = os.environ.get("TIKTOK_ADVERTISER_ID", "")

BASE_URL = "https://business-api.tiktok.com/open_api/v1.3"


def get_headers():
    return {
        "Access-Token": TIKTOK_ACCESS_TOKEN,
        "Content-Type": "application/json"
    }


async def upload_criativo(media_path: str, nome: str) -> dict:
    """Upload de vídeo/imagem para a Creative Library do TikTok."""
    # TODO: implementar após aprovação
    raise NotImplementedError("TikTok API pendente de aprovação")


async def listar_campanhas_ativas() -> list:
    """Retorna campanhas com status ENABLE."""
    # TODO: implementar após aprovação
    raise NotImplementedError("TikTok API pendente de aprovação")


async def listar_adsets_ativos(campaign_id: str) -> list:
    """Retorna adsets ativos de uma campanha."""
    # TODO: implementar após aprovação
    raise NotImplementedError("TikTok API pendente de aprovação")


async def criar_anuncio(
    adgroup_id: str,
    nome: str,
    copy: str,
    url: str,
    creative_id: str
) -> dict:
    """Cria um anúncio em um adset."""
    # TODO: implementar após aprovação
    raise NotImplementedError("TikTok API pendente de aprovação")


async def get_metricas(
    advertiser_id: str,
    start_date: str,
    end_date: str
) -> list:
    """Retorna métricas dos criativos (impressões, cliques, CTR, CPA)."""
    # TODO: implementar após aprovação
    raise NotImplementedError("TikTok API pendente de aprovação")
