const BASE = "http://localhost:8000";

export const api = {
  listarCriativos: (platform = null) =>
    fetch(`${BASE}/creatives/${platform ? `?platform=${platform}` : ""}`).then((r) => r.json()),

  aprovar: (id, url, copy, metaCopy = null) =>
    fetch(`${BASE}/creatives/aprovar/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, copy, ...metaCopy }),
    }).then((r) => r.json()),

  rejeitar: (id) =>
    fetch(`${BASE}/creatives/rejeitar/${id}`, { method: "POST" }).then((r) => r.json()),

  publicar: (id, payload = {}) =>
    fetch(`${BASE}/creatives/subido/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r.json()),

  updateCopy: (id, copy) =>
    fetch(`${BASE}/creatives/update-copy/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ copy }),
    }).then((r) => r.json()),

  generateCopy: (id, platform = "tiktok") =>
    fetch(`${BASE}/creatives/generate-copy/${id}?platform=${platform}`, { method: "POST" }).then((r) => r.json()),

  deletar: (id) =>
    fetch(`${BASE}/creatives/${id}`, { method: "DELETE" }).then((r) => r.json()),

  insights: (start, end) =>
    fetch(`${BASE}/insights/?start_date=${start}&end_date=${end}`).then((r) => r.json()),

  getCampanhas: (platform = "tiktok") =>
    fetch(`${BASE}/${platform}/campanhas`).then((r) => r.json()),

  getMetaPages: () =>
    fetch(`${BASE}/meta/pages`).then((r) => r.json()),

  getMetaAdAccounts: () =>
    fetch(`${BASE}/meta/ad-accounts`).then((r) => r.json()),

  getSettings: () =>
    fetch(`${BASE}/settings/`).then((r) => r.json()),

  saveSettings: (data) =>
    fetch(`${BASE}/settings/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  uploadContextFile: (file) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE}/settings/context-file`, { method: "POST", body: form }).then((r) => r.json());
  },

  deleteContextFile: () =>
    fetch(`${BASE}/settings/context-file`, { method: "DELETE" }).then((r) => r.json()),
};
