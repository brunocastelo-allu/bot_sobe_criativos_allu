import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";

const TABS = [
  { id: "perfil",       label: "Informações de Perfil" },
  { id: "integracoes",  label: "Integrações" },
  { id: "rastreamento", label: "Rastreamento (UTMs)" },
  { id: "ia",           label: "Inteligência Artificial" },
];

export default function Settings() {
  const { user } = useAuth();
  const [tab, setTab] = useState("perfil");
  const [form, setForm] = useState({
    tiktok_api_key: "", meta_api_key: "",
    meta_ad_account_id: "", utm_tiktok: "", utm_meta: "",
  });
  const [pwForm, setPwForm]     = useState({ old: "", new: "", confirm: "" });
  const [pwError, setPwError]   = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [copies, setCopies]               = useState([]);
  const [newCopy, setNewCopy]             = useState("");
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);
  const [contextFileName, setContextFileName] = useState(null);
  const [uploadingCtx, setUploadingCtx]   = useState(false);
  const [adAccounts, setAdAccounts]       = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const inputRef   = useRef();
  const ctxInputRef = useRef();

  useEffect(() => {
    api.getSettings().then((d) => {
      if (!d) return;
      setForm((f) => ({
        ...f,
        email:             d.email || "",
        tiktok_api_key:    d.tiktok_api_key || "",
        meta_api_key:      d.meta_api_key || "",
        meta_ad_account_id: d.meta_ad_account_id || "",
        utm_tiktok:        d.utm_tiktok || "",
        utm_meta:          d.utm_meta || "",
      }));
      setCopies(Array.isArray(d.reference_copies) ? d.reference_copies : []);
      setContextFileName(d.context_file_name || null);
      if (d.meta_api_key) {
        api.getMetaAdAccounts().then((a) => { if (Array.isArray(a)) setAdAccounts(a); }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  /* ── Meta OAuth ── */
  const handleMetaLogin = () => {
    const base = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const popup = window.open(
      `${base}/settings/meta/login`,
      "meta-oauth",
      "width=620,height=720,scrollbars=yes,resizable=yes"
    );
    const onMessage = (e) => {
      if (e.data?.type !== "meta_oauth") return;
      window.removeEventListener("message", onMessage);
      if (e.data.success) {
        api.getSettings().then((d) => {
          if (d?.meta_api_key) {
            setForm((f) => ({ ...f, meta_api_key: d.meta_api_key }));
            api.getMetaAdAccounts().then((a) => { if (Array.isArray(a)) setAdAccounts(a); }).catch(() => {});
          }
        }).catch(() => {});
      } else {
        alert("Erro ao conectar com Meta: " + (e.data.error || "desconhecido"));
      }
    };
    window.addEventListener("message", onMessage);
    const timer = setInterval(() => {
      if (popup?.closed) { clearInterval(timer); window.removeEventListener("message", onMessage); }
    }, 500);
  };

  const handleMetaDisconnect = async () => {
    if (!window.confirm("Desconectar conta Meta? O token salvo será removido.")) return;
    await api.deleteMetaToken().catch(() => {});
    setForm((f) => ({ ...f, meta_api_key: "" }));
    setAdAccounts([]);
  };

  const handleLoadAccounts = () => {
    setLoadingAccounts(true);
    api.getMetaAdAccounts()
      .then((a) => { if (Array.isArray(a)) setAdAccounts(a); })
      .catch(() => {})
      .finally(() => setLoadingAccounts(false));
  };

  /* ── Reference copies ── */
  const addCopy = () => {
    const trimmed = newCopy.trim();
    if (!trimmed || copies.includes(trimmed)) return;
    if (trimmed.length > 125) { alert("A copy deve ter no máximo 125 caracteres."); return; }
    setCopies((prev) => [...prev, trimmed]);
    setNewCopy("");
    inputRef.current?.focus();
  };
  const removeCopy = (idx) => setCopies((prev) => prev.filter((_, i) => i !== idx));

  /* ── Context file ── */
  const handleContextUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCtx(true);
    try {
      const res = await api.uploadContextFile(file);
      if (res.filename) setContextFileName(res.filename);
    } catch { alert("Erro ao enviar o arquivo."); }
    finally { setUploadingCtx(false); e.target.value = ""; }
  };
  const handleContextDelete = async () => {
    await api.deleteContextFile().catch(() => {});
    setContextFileName(null);
  };

  /* ── Change password ── */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    if (pwForm.new !== pwForm.confirm) { setPwError("As senhas não coincidem."); return; }
    if (pwForm.new.length < 8) { setPwError("Nova senha deve ter pelo menos 8 caracteres."); return; }
    setPwSaving(true);
    const res = await api.changePassword(pwForm.old, pwForm.new).catch(() => null);
    setPwSaving(false);
    if (!res || res.detail) {
      setPwError(res?.detail || "Erro ao alterar senha.");
    } else {
      setPwSuccess(true);
      setPwForm({ old: "", new: "", confirm: "" });
      setTimeout(() => setPwSuccess(false), 3000);
    }
  };

  /* ── Save settings ── */
  const handleSave = async () => {
    setSaving(true);
    await api.saveSettings({
      tiktok_api_key:     form.tiktok_api_key,
      meta_api_key:       form.meta_api_key,
      meta_ad_account_id: form.meta_ad_account_id,
      reference_copies:   copies,
      utm_tiktok:         form.utm_tiktok,
      utm_meta:           form.utm_meta,
    }).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const field = (label, name, type = "text", placeholder = "", hint = null) => (
    <div className="settings-field">
      <label className="settings-label">{label}</label>
      <input
        type={type}
        className="settings-input"
        value={form[name]}
        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
        placeholder={placeholder}
        autoComplete="off"
      />
      {hint && <p className="settings-hint" style={{ margin: "5px 0 0" }}>{hint}</p>}
    </div>
  );

  return (
    <div className="page settings-page">
      <div className="toolbar"><h1>Configurações</h1></div>

      {/* ── Tab bar ── */}
      <div className="stabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`stab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>

        {/* ── Perfil ── */}
        {tab === "perfil" && (
          <div className="stab-content">
            <div className="settings-card">
              <div className="settings-card-title">Dados da Conta</div>
              <div className="settings-field">
                <label className="settings-label">Email</label>
                <input type="email" className="settings-input" value={user?.email || ""} readOnly
                  style={{ background: "#F2F2F7", color: "#9CA3AF", cursor: "default" }} />
              </div>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className="settings-card">
                <div className="settings-card-title">Alterar Senha</div>
                <div className="settings-field">
                  <label className="settings-label">Senha Atual</label>
                  <input type="password" className="settings-input" placeholder="••••••••"
                    value={pwForm.old} onChange={(e) => setPwForm((f) => ({ ...f, old: e.target.value }))} autoComplete="current-password" />
                </div>
                <div className="settings-field">
                  <label className="settings-label">Nova Senha</label>
                  <input type="password" className="settings-input" placeholder="Mínimo 8 caracteres"
                    value={pwForm.new} onChange={(e) => setPwForm((f) => ({ ...f, new: e.target.value }))} autoComplete="new-password" />
                </div>
                <div className="settings-field" style={{ marginBottom: 0 }}>
                  <label className="settings-label">Confirmar Nova Senha</label>
                  <input type="password" className="settings-input" placeholder="Repita a nova senha"
                    value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} autoComplete="new-password" />
                </div>
              </div>
              <div className="settings-footer" style={{ marginTop: 4 }}>
                <button type="submit" className="btn-primary" disabled={pwSaving || !pwForm.old || !pwForm.new || !pwForm.confirm}>
                  {pwSaving ? "Salvando..." : "Alterar Senha"}
                </button>
                {pwSuccess && <span className="save-ok">Senha alterada!</span>}
                {pwError && <span style={{ fontSize: 13, color: "#E53E3E" }}>{pwError}</span>}
              </div>
            </form>
          </div>
        )}

        {/* ── Integrações ── */}
        {tab === "integracoes" && (
          <div className="stab-content">
            <div className="settings-card">
              <div className="settings-card-title">TikTok</div>
              {field("TikTok Marketing API Key", "tiktok_api_key", "password", "Insira sua API Key")}
            </div>

            <div className="settings-card">
              <div className="settings-card-title">Meta (Facebook / Instagram)</div>

              <div className="settings-field">
                <label className="settings-label">Conta Meta</label>
                {form.meta_api_key ? (
                  <div className="meta-oauth-connected">
                    <span className="meta-oauth-badge"><MetaIcon /> Conectado ao Meta</span>
                    <button type="button" className="btn-secondary meta-oauth-disconnect" onClick={handleMetaDisconnect}>
                      Desconectar
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btn-meta-login" onClick={handleMetaLogin}>
                    <MetaIcon color="white" /> Entrar com Meta
                  </button>
                )}
              </div>

              <div className="settings-field" style={{ marginBottom: 0 }}>
                <label className="settings-label">
                  Conta de Anúncios
                  {form.meta_api_key && (
                    <button type="button" className="btn-secondary"
                      style={{ marginLeft: 8, padding: "2px 10px", fontSize: 12 }}
                      onClick={handleLoadAccounts} disabled={loadingAccounts}>
                      {loadingAccounts ? "Carregando..." : "Carregar contas"}
                    </button>
                  )}
                </label>
                {adAccounts.length > 0 ? (
                  <select className="settings-input" value={form.meta_ad_account_id}
                    onChange={(e) => setForm((f) => ({ ...f, meta_ad_account_id: e.target.value }))}>
                    <option value="">Selecione uma conta...</option>
                    {adAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                    ))}
                  </select>
                ) : (
                  <p className="settings-hint" style={{ margin: "4px 0 0" }}>
                    {form.meta_api_key ? 'Clique em "Carregar contas" para listar.' : "Conecte sua conta Meta primeiro."}
                  </p>
                )}
              </div>
            </div>
            <SaveFooter saving={saving} saved={saved} onSave={handleSave} />
          </div>
        )}

        {/* ── Rastreamento ── */}
        {tab === "rastreamento" && (
          <div className="stab-content">
            <div className="settings-card">
              <div className="settings-card-title">Padrões de UTM</div>
              <p className="settings-hint">
                Quando "Adicionar UTMs" estiver marcado no card, esses parâmetros serão
                concatenados automaticamente na URL antes de publicar.
              </p>
              <div className="settings-field">
                <label className="settings-label">TikTok Ads</label>
                <input type="text" className="settings-input" value={form.utm_tiktok}
                  onChange={(e) => setForm((f) => ({ ...f, utm_tiktok: e.target.value }))}
                  placeholder="utm_source=tiktok&utm_medium=cpc&utm_campaign=__CAMPAIGN_NAME__" />
              </div>
              <div className="settings-field" style={{ marginBottom: 0 }}>
                <label className="settings-label">Meta Ads</label>
                <input type="text" className="settings-input" value={form.utm_meta}
                  onChange={(e) => setForm((f) => ({ ...f, utm_meta: e.target.value }))}
                  placeholder="utm_source=facebook&utm_medium=cpc&utm_campaign={{campaign.name}}" />
              </div>
            </div>
            <SaveFooter saving={saving} saved={saved} onSave={handleSave} />
          </div>
        )}

        {/* ── Inteligência Artificial ── */}
        {tab === "ia" && (
          <div className="stab-content">
            <div className="ai-two-col">

              {/* Coluna esquerda — Documento de Contexto */}
              <div className="settings-card">
                <div className="settings-card-title">Documento de Contexto</div>
                <p className="settings-hint">
                  Suba um PDF ou TXT com contexto da marca e exemplos. O Gemini vai ler
                  esse arquivo antes de gerar qualquer copy.
                </p>
                <input ref={ctxInputRef} type="file" accept=".pdf,.txt"
                  style={{ display: "none" }} onChange={handleContextUpload} />
                {contextFileName ? (
                  <div className="ctx-file-row">
                    <span className="ctx-file-icon">📄</span>
                    <span className="ctx-file-name">{contextFileName}</span>
                    <button type="button" className="ctx-file-remove"
                      onClick={handleContextDelete} title="Remover">×</button>
                  </div>
                ) : (
                  <div className="ctx-upload-zone" onClick={() => !uploadingCtx && ctxInputRef.current.click()}>
                    <div className="ctx-upload-icon">
                      <svg width="20" height="20" fill="none" stroke="#27AE60" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <p className="ctx-upload-label">{uploadingCtx ? "Enviando..." : "Clique para selecionar"}</p>
                    <p className="ctx-upload-hint">.pdf ou .txt</p>
                  </div>
                )}
              </div>

              {/* Coluna direita — Copys de Referência */}
              <div className="settings-card">
                <div className="settings-card-title">Copys de Referência</div>
                <p className="settings-hint">
                  Adicione copies aprovadas como modelo de estilo. O Gemini vai usá-las
                  como referência em cada geração.
                </p>
                <div className="ref-copy-add">
                  <input
                    ref={inputRef}
                    type="text"
                    className="settings-input"
                    placeholder="Cole ou escreva uma copy (máx 125 chars)"
                    maxLength={125}
                    value={newCopy}
                    onChange={(e) => setNewCopy(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCopy(); } }}
                  />
                  <div className="ref-copy-add-row">
                    <span className="ref-copy-char">{newCopy.length}/125</span>
                    <button type="button" className="btn-secondary" onClick={addCopy} disabled={!newCopy.trim()}>
                      + Adicionar
                    </button>
                  </div>
                </div>
                {copies.length > 0 ? (
                  <ul className="ref-copy-list">
                    {copies.map((c, i) => (
                      <li key={i} className="ref-copy-item">
                        <span className="ref-copy-text">"{c}"</span>
                        <button type="button" className="ref-copy-remove" onClick={() => removeCopy(i)} title="Remover">×</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="ref-copy-empty">Nenhuma copy adicionada ainda.</p>
                )}
              </div>

            </div>
            <SaveFooter saving={saving} saved={saved} onSave={handleSave} />
          </div>
        )}

      </div>
    </div>
  );
}

function SaveFooter({ saving, saved, onSave }) {
  return (
    <div className="settings-footer">
      <button type="button" className="btn-primary" disabled={saving} onClick={onSave}>
        {saving ? "Salvando..." : "Salvar"}
      </button>
      {saved && <span className="save-ok">Salvo!</span>}
    </div>
  );
}

function MetaIcon({ color = "#1877F2" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.883v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  );
}
