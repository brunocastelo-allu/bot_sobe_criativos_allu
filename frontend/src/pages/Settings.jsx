import { useEffect, useRef, useState } from "react";
import { api } from "../api";

export default function Settings() {
  const [form, setForm] = useState({
    email: "", senha: "", tiktok_api_key: "", meta_api_key: "",
    meta_ad_account_id: "", utm_tiktok: "", utm_meta: "",
  });
  const [copies, setCopies] = useState([]);
  const [newCopy, setNewCopy] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [contextFileName, setContextFileName] = useState(null);
  const [uploadingCtx, setUploadingCtx] = useState(false);
  const [adAccounts, setAdAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const inputRef = useRef();
  const ctxInputRef = useRef();

  useEffect(() => {
    api.getSettings().then((d) => {
      if (d) {
        setForm((f) => ({
          ...f,
          email: d.email || "",
          tiktok_api_key: d.tiktok_api_key || "",
          meta_api_key: d.meta_api_key || "",
          meta_ad_account_id: d.meta_ad_account_id || "",
          utm_tiktok: d.utm_tiktok || "",
          utm_meta: d.utm_meta || "",
        }));
        setCopies(Array.isArray(d.reference_copies) ? d.reference_copies : []);
        setContextFileName(d.context_file_name || null);
        if (d.meta_api_key) {
          api.getMetaAdAccounts().then((accounts) => {
            if (Array.isArray(accounts)) setAdAccounts(accounts);
          }).catch(() => {});
        }
      }
    }).catch(() => {});
  }, []);

  const handleLoadAccounts = () => {
    if (!form.meta_api_key) return;
    setLoadingAccounts(true);
    api.getMetaAdAccounts().then((accounts) => {
      if (Array.isArray(accounts)) setAdAccounts(accounts);
    }).catch(() => {}).finally(() => setLoadingAccounts(false));
  };

  const addCopy = () => {
    const trimmed = newCopy.trim();
    if (!trimmed || copies.includes(trimmed)) return;
    if (trimmed.length > 125) { alert("A copy deve ter no maximo 125 caracteres."); return; }
    setCopies((prev) => [...prev, trimmed]);
    setNewCopy("");
    inputRef.current?.focus();
  };

  const removeCopy = (idx) => setCopies((prev) => prev.filter((_, i) => i !== idx));

  const handleContextUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCtx(true);
    try {
      const res = await api.uploadContextFile(file);
      if (res.filename) setContextFileName(res.filename);
    } catch {
      alert("Erro ao enviar o arquivo.");
    } finally {
      setUploadingCtx(false);
      e.target.value = "";
    }
  };

  const handleContextDelete = async () => {
    await api.deleteContextFile().catch(() => {});
    setContextFileName(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await api.saveSettings({
      email: form.email,
      tiktok_api_key: form.tiktok_api_key,
      meta_api_key: form.meta_api_key,
      meta_ad_account_id: form.meta_ad_account_id,
      reference_copies: copies,
      utm_tiktok: form.utm_tiktok,
      utm_meta: form.utm_meta,
    }).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const f = (label, name, type = "text", placeholder = "") => (
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
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <div className="toolbar"><h1>Configuracoes</h1></div>
      <form onSubmit={handleSave}>

        <div className="settings-section">
          <div className="settings-section-title">Dados do Usuario</div>
          {f("Email", "email", "email", "seu@email.com")}
          {f("Nova Senha", "senha", "password", "••••••••")}
        </div>

        <div className="settings-section">
          <div className="settings-section-title">Integracoes — API Keys</div>
          {f("TikTok Marketing API Key", "tiktok_api_key", "password", "Insira sua API Key")}
          {f("Meta Graph API Key", "meta_api_key", "password", "Insira sua API Key")}
          <div className="settings-field">
            <label className="settings-label">
              Conta de Anuncios Meta
              <button type="button" className="btn-secondary" style={{ marginLeft: 8, padding: "2px 10px", fontSize: 12 }} onClick={handleLoadAccounts} disabled={loadingAccounts || !form.meta_api_key}>
                {loadingAccounts ? "Carregando..." : "Carregar contas"}
              </button>
            </label>
            {adAccounts.length > 0 ? (
              <select
                className="settings-input"
                value={form.meta_ad_account_id}
                onChange={(e) => setForm((f) => ({ ...f, meta_ad_account_id: e.target.value }))}
              >
                <option value="">Selecione uma conta...</option>
                {adAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                ))}
              </select>
            ) : (
              <p className="settings-hint" style={{ margin: "4px 0 0" }}>Clique em "Carregar contas" apos configurar o token Meta.</p>
            )}
          </div>
        </div>

        {/* ── UTM Patterns ── */}
        <div className="settings-section">
          <div className="settings-section-title">Padroes de Rastreamento (UTMs)</div>
          <p className="settings-hint">
            Defina os padroes de UTM para cada rede. Quando a opcao "Adicionar UTMs" estiver marcada no card, esses parametros serao concatenados automaticamente na URL antes de publicar.
          </p>
          <div className="settings-field">
            <label className="settings-label">TikTok Ads — padrao de UTM</label>
            <input
              type="text"
              className="settings-input"
              value={form.utm_tiktok}
              onChange={(e) => setForm((f) => ({ ...f, utm_tiktok: e.target.value }))}
              placeholder="utm_source=tiktok&utm_medium=cpc&utm_campaign=__CAMPAIGN_NAME__"
            />
          </div>
          <div className="settings-field">
            <label className="settings-label">Meta Ads — padrao de UTM</label>
            <input
              type="text"
              className="settings-input"
              value={form.utm_meta}
              onChange={(e) => setForm((f) => ({ ...f, utm_meta: e.target.value }))}
              placeholder="utm_source=facebook&utm_medium=cpc&utm_campaign={{campaign.name}}"
            />
          </div>
        </div>

        {/* ── Context document ── */}
        <div className="settings-section">
          <div className="settings-section-title">Documento de Contexto (IA)</div>
          <p className="settings-hint">
            Suba um PDF ou TXT com contexto da marca, funcionamento esperado e exemplos. O Gemini vai ler esse arquivo antes de gerar qualquer copy.
          </p>
          <input ref={ctxInputRef} type="file" accept=".pdf,.txt" style={{ display: "none" }} onChange={handleContextUpload} />
          {contextFileName ? (
            <div className="ctx-file-row">
              <span className="ctx-file-icon">📄</span>
              <span className="ctx-file-name">{contextFileName}</span>
              <button type="button" className="ctx-file-remove" onClick={handleContextDelete} title="Remover arquivo">×</button>
            </div>
          ) : (
            <button type="button" className="btn-secondary" onClick={() => ctxInputRef.current.click()} disabled={uploadingCtx}>
              {uploadingCtx ? "Enviando..." : "Selecionar arquivo (.pdf ou .txt)"}
            </button>
          )}
        </div>

        {/* ── Reference copies ── */}
        <div className="settings-section">
          <div className="settings-section-title">Copys de Referencia (IA)</div>
          <p className="settings-hint">
            Adicione copies aprovadas que serviram bem. O Gemini vai usar como modelo de estilo e qualidade em cada geracao.
          </p>
          <div className="ref-copy-add">
            <input
              ref={inputRef}
              type="text"
              className="settings-input"
              placeholder="Cole ou escreva uma copy de referencia (max 125 chars)"
              maxLength={125}
              value={newCopy}
              onChange={(e) => setNewCopy(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCopy(); } }}
            />
            <div className="ref-copy-add-row">
              <span className="ref-copy-char">{newCopy.length}/125</span>
              <button type="button" className="btn-secondary" onClick={addCopy} disabled={!newCopy.trim()}>+ Adicionar</button>
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
            <p className="ref-copy-empty">Nenhuma copy de referencia adicionada ainda.</p>
          )}
        </div>

        <div className="settings-footer">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Configuracoes"}
          </button>
          {saved && <span className="save-ok">Salvo!</span>}
        </div>
      </form>
    </div>
  );
}
