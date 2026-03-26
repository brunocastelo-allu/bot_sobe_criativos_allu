import os
import tempfile
from google.cloud import storage

_BUCKET = os.environ.get("GCS_BUCKET", "allu-ads-uploads")


def _client():
    return storage.Client()


def upload_file(local_path: str, blob_name: str) -> str:
    """Faz upload de arquivo local para o GCS. Retorna o blob_name."""
    _client().bucket(_BUCKET).blob(blob_name).upload_from_filename(local_path)
    return blob_name


def download_to_temp(blob_name: str) -> str:
    """Baixa arquivo do GCS para arquivo temporário local. Retorna o caminho."""
    ext = os.path.splitext(blob_name)[1]
    tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    tmp.close()
    _client().bucket(_BUCKET).blob(blob_name).download_to_filename(tmp.name)
    return tmp.name


def delete_file(blob_name: str):
    """Remove arquivo do GCS. Silencia erros (ex: arquivo já deletado)."""
    try:
        _client().bucket(_BUCKET).blob(blob_name).delete()
    except Exception:
        pass
