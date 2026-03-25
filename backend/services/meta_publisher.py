import os
import json
import uuid
import mimetypes
import urllib.request
import urllib.parse
import urllib.error

BASE = "https://graph.facebook.com/v21.0"
BASE_VIDEO = "https://graph-video.facebook.com/v21.0"


def _json_post(url_base, token, data):
    url = f"{url_base}?access_token={urllib.parse.quote(token, safe='')}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        r = urllib.request.urlopen(req, timeout=30)
        return json.loads(r.read()), None
    except urllib.error.HTTPError as e:
        try:
            err = json.loads(e.read()).get("error", {})
        except Exception:
            err = {"message": str(e)}
        return None, err
    except Exception as e:
        return None, {"message": str(e)}


def _multipart_post(url_base, token, fields, file_field, filename, file_bytes, content_type):
    url = f"{url_base}?access_token={urllib.parse.quote(token, safe='')}"
    boundary = uuid.uuid4().hex
    body = b""
    for key, value in fields.items():
        body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{key}\"\r\n\r\n{value}\r\n".encode()
    body += (
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"{file_field}\"; filename=\"{filename}\"\r\n"
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode()
    body += file_bytes + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    try:
        r = urllib.request.urlopen(req, timeout=120)
        return json.loads(r.read()), None
    except urllib.error.HTTPError as e:
        try:
            err = json.loads(e.read()).get("error", {})
        except Exception:
            err = {"message": str(e)}
        return None, err
    except Exception as e:
        return None, {"message": str(e)}


def upload_image(token, ad_account_id, image_path):
    filename = os.path.basename(image_path)
    mime = mimetypes.guess_type(filename)[0] or "image/jpeg"
    with open(image_path, "rb") as f:
        data = f.read()
    result, err = _multipart_post(
        f"{BASE}/{ad_account_id}/adimages",
        token, {}, filename, filename, data, mime,
    )
    if err:
        raise RuntimeError(f"Upload de imagem falhou: {err.get('message', err)}")
    for v in result.get("images", {}).values():
        return v["hash"]
    raise RuntimeError("Hash da imagem nao encontrado na resposta da Meta.")


def upload_video(token, ad_account_id, video_path):
    filename = os.path.basename(video_path)
    mime = mimetypes.guess_type(filename)[0] or "video/mp4"
    with open(video_path, "rb") as f:
        data = f.read()
    result, err = _multipart_post(
        f"{BASE_VIDEO}/{ad_account_id}/advideos",
        token, {"name": filename}, "source", filename, data, mime,
    )
    if err:
        raise RuntimeError(f"Upload de video falhou: {err.get('message', err)}")
    video_id = result.get("id")
    if not video_id:
        raise RuntimeError("ID do video nao encontrado na resposta da Meta.")
    return video_id


def create_ad_creative(token, ad_account_id, page_id, url, primary_text, headline, description,
                       image_hash=None, video_id=None):
    if image_hash:
        link_data = {
            "image_hash": image_hash,
            "link": url,
            "call_to_action": {"type": "LEARN_MORE", "value": {"link": url}},
        }
        if primary_text:
            link_data["message"] = primary_text
        if headline:
            link_data["name"] = headline
        if description:
            link_data["description"] = description
        story_spec = {"page_id": page_id, "link_data": link_data}
    else:
        video_data = {"video_id": video_id, "call_to_action": {"type": "LEARN_MORE", "value": {"link": url}}}
        if headline:
            video_data["title"] = headline
        if primary_text:
            video_data["message"] = primary_text
        story_spec = {"page_id": page_id, "video_data": video_data}
    result, err = _json_post(
        f"{BASE}/{ad_account_id}/adcreatives",
        token,
        {"name": f"Creative_{ad_account_id}_{uuid.uuid4().hex[:6]}", "object_story_spec": story_spec},
    )
    if err:
        detail = err.get("error_user_msg") or err.get("message") or str(err)
        subcode = err.get("error_subcode", "")
        raise RuntimeError(f"Criacao do AdCreative falhou: {detail}{f' (subcode {subcode})' if subcode else ''}")
    creative_id = result.get("id")
    if not creative_id:
        raise RuntimeError("ID do creative nao encontrado na resposta da Meta.")
    return creative_id


def create_ad(token, ad_account_id, adset_id, creative_id, name):
    result, err = _json_post(
        f"{BASE}/{ad_account_id}/ads",
        token,
        {
            "name": name,
            "adset_id": adset_id,
            "creative": {"creative_id": creative_id},
            "status": "PAUSED",
        },
    )
    if err:
        raise RuntimeError(f"Criacao do Ad falhou no adset {adset_id}: {err.get('message', err)}")
    return result.get("id")


def publish_creative(token, ad_account_id, page_id, adset_ids, url,
                     primary_text, headline, description, file_path, ad_name):
    ext = os.path.splitext(file_path)[1].lower()
    is_video = ext in (".mp4", ".mov", ".avi", ".mkv")

    if is_video:
        video_id = upload_video(token, ad_account_id, file_path)
        creative_id = create_ad_creative(
            token, ad_account_id, page_id, url,
            primary_text, headline, description, video_id=video_id,
        )
    else:
        image_hash = upload_image(token, ad_account_id, file_path)
        creative_id = create_ad_creative(
            token, ad_account_id, page_id, url,
            primary_text, headline, description, image_hash=image_hash,
        )

    ads = []
    errors = []
    for adset_id in adset_ids:
        try:
            ad_id = create_ad(token, ad_account_id, adset_id, creative_id, ad_name)
            ads.append({"adset_id": adset_id, "ad_id": ad_id})
        except RuntimeError as e:
            errors.append({"adset_id": adset_id, "error": str(e)})

    return {"creative_id": creative_id, "ads": ads, "errors": errors}
