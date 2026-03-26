const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const _token = () => localStorage.getItem("token");

async function _fetch(path, options = {}) {
  const token = _token();
  const headers = { ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const r = await fetch(`${BASE}${path}`, { ...options, headers });
  if (r.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    return null;
  }
  return r;
}

export const api = {
  // ── Auth (público) ───────────────────────────────────────────────────────
  login: (email, password) =>
    fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then((r) => r.json()),

  register: (email, password, nome = "") =>
    fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, nome }),
    }).then((r) => r.json()),

  // ── Criativos ────────────────────────────────────────────────────────────
  listarCriativos: (platform = null) =>
    _fetch(`/creatives/${platform ? `?platform=${platform}` : ""}`).then((r) => r?.json()),

  aprovar: (id, url, copy, metaCopy = null) =>
    _fetch(`/creatives/aprovar/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, copy, ...metaCopy }),
    }).then((r) => r?.json()),

  rejeitar: (id) =>
    _fetch(`/creatives/rejeitar/${id}`, { method: "POST" }).then((r) => r?.json()),

  publicar: (id, payload = {}) =>
    _fetch(`/creatives/subido/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r?.json()),

  updateCopy: (id, copy) =>
    _fetch(`/creatives/update-copy/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ copy }),
    }).then((r) => r?.json()),

  generateCopy: (id, platform = "tiktok") =>
    _fetch(`/creatives/generate-copy/${id}?platform=${platform}`, { method: "POST" }).then((r) => r?.json()),

  deletar: (id) =>
    _fetch(`/creatives/${id}`, { method: "DELETE" }).then((r) => r?.json()),

  // ── Insights ─────────────────────────────────────────────────────────────
  insights: (start, end) =>
    _fetch(`/insights/?start_date=${start}&end_date=${end}`).then((r) => r?.json()),

  // ── Campanhas ────────────────────────────────────────────────────────────
  getCampanhas: (platform = "tiktok") =>
    _fetch(`/${platform}/campanhas`).then((r) => r?.json()),

  getMetaPages: () =>
    _fetch(`/meta/pages`).then((r) => r?.json()),

  getMetaAdAccounts: () =>
    _fetch(`/meta/ad-accounts`).then((r) => r?.json()),

  // ── Settings ─────────────────────────────────────────────────────────────
  getSettings: () =>
    _fetch(`/settings/`).then((r) => r?.json()),

  saveSettings: (data) =>
    _fetch(`/settings/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r?.json()),

  uploadContextFile: (file) => {
    const form = new FormData();
    form.append("file", file);
    return _fetch(`/settings/context-file`, { method: "POST", body: form }).then((r) => r?.json());
  },

  deleteContextFile: () =>
    _fetch(`/settings/context-file`, { method: "DELETE" }).then((r) => r?.json()),

  deleteMetaToken: () =>
    _fetch(`/settings/meta/token`, { method: "DELETE" }).then((r) => r?.json()),

  changePassword: (old_password, new_password) =>
    _fetch(`/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_password, new_password }),
    }).then((r) => r?.json()),
};
