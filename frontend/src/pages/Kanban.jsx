import { useEffect, useRef, useState } from "react";
import { api } from "../api";

const ACCEPT = "video/mp4,video/quicktime,video/x-msvideo,image/png,image/jpeg,image/gif";

function formatBytes(b) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}


const COLUMNS = [
  { key: "fila",      label: "Fila",              badge: "badge-fila",
    filter: (c) => !c.copy_aprovada && (c.status || "") !== "REJEITADO" && !(c.status || "").startsWith("ERRO") },
  { key: "upload",    label: "Aguardando Upload",  badge: "badge-aguardando",
    filter: (c) => c.copy_aprovada && (c.status || "") !== "OK" && (c.status || "") !== "REJEITADO" && !(c.status || "").startsWith("ERRO") },
  { key: "subido",    label: "Subido",             badge: "badge-subido",
    filter: (c) => c.status === "OK" },
  { key: "erro",      label: "Erro / Rejeitado",   badge: "badge-erro",
    filter: (c) => (c.status || "").startsWith("ERRO") || c.status === "REJEITADO" },
];

/* ── Icons ── */
const IcoVideo = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
  </svg>
);
const IcoImage = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);
const IcoRobot = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"/>
    <path d="M12 11V8"/><circle cx="12" cy="6" r="2"/>
    <line x1="8" y1="16" x2="8" y2="16" strokeWidth="3"/>
    <line x1="16" y1="16" x2="16" y2="16" strokeWidth="3"/>
    <line x1="9" y1="20" x2="15" y2="20"/>
  </svg>
);
const IcoTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const IcoUpload = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

/* ── Upload Modal ── */
function UploadModal({ onClose, onDone, onCardCreated, platform = "tiktok" }) {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const addFiles = (raw) => {
    const entries = Array.from(raw).map((f) => ({ id: `${f.name}-${f.size}`, file: f, status: "pending", progress: 0, errorMsg: "" }));
    setFiles((prev) => { const ids = new Set(prev.map((e) => e.id)); return [...prev, ...entries.filter((e) => !ids.has(e.id))]; });
  };

  const uploadFile = (entry) =>
    new Promise((resolve) => {
      const form = new FormData();
      form.append("file", entry.file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/creatives/upload?platform=${platform}`);
      const token = localStorage.getItem("token");
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          setFiles((p) => p.map((f) => f.id === entry.id ? { ...f, progress: Math.round((e.loaded / e.total) * 100) } : f));
      };
      xhr.onload = () => {
        const ok = xhr.status === 200;
        let errorMsg = "";
        if (ok) {
          try { const data = JSON.parse(xhr.responseText); if (data.card) onCardCreated(data.card); }
          catch (err) { console.error("Erro ao parsear resposta:", err); }
        } else {
          try { errorMsg = JSON.parse(xhr.responseText).detail || `HTTP ${xhr.status}`; }
          catch { errorMsg = `HTTP ${xhr.status}`; }
        }
        setFiles((p) => p.map((f) => f.id === entry.id ? { ...f, status: ok ? "done" : "error", errorMsg, progress: 100 } : f));
        resolve();
      };
      xhr.onerror = () => {
        setFiles((p) => p.map((f) => f.id === entry.id ? { ...f, status: "error", errorMsg: "Sem conexao com o backend", progress: 0 } : f));
        resolve();
      };
      xhr.send(form);
    });

  const handleUpload = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (!pending.length) return;
    setUploading(true);
    for (const e of pending) {
      setFiles((p) => p.map((f) => (f.id === e.id ? { ...f, status: "uploading" } : f)));
      await uploadFile(e);
    }
    setUploading(false);
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const finished = files.length > 0 && !uploading && files.every((f) => f.status !== "pending" && f.status !== "uploading");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Novo Criativo</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div
            className={`upload-zone${dragOver ? " drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current.click()}
          >
            <input ref={inputRef} type="file" multiple accept={ACCEPT} style={{ display: "none" }} onChange={(e) => addFiles(e.target.files)} />
            <div className="upload-icon-circle"><IcoUpload /></div>
            <h3>Arraste os criativos aqui</h3>
            <p>ou <span>clique para selecionar</span></p>
            <small>MP4 · MOV · PNG · JPG · GIF</small>
          </div>
          {files.length > 0 && (
            <div className="file-list">
              {files.map((entry) => (
                <div className="file-item" key={entry.id}>
                  <div className="file-thumb">{entry.file.type.startsWith("video") ? <IcoVideo /> : <IcoImage />}</div>
                  <div className="file-info">
                    <div className="file-name">{entry.file.name}</div>
                    <div className="file-size">{formatBytes(entry.file.size)}</div>
                    {entry.status === "uploading" && <div className="progress-bar"><div className="progress-fill" style={{ width: `${entry.progress}%` }} /></div>}
                    {entry.status === "error" && entry.errorMsg && <div className="file-err">{entry.errorMsg}</div>}
                  </div>
                  <span className={`file-status ${entry.status}`}>
                    {entry.status === "pending" && "Aguardando"}
                    {entry.status === "uploading" && `${entry.progress}%`}
                    {entry.status === "done" && "✓ Enviado"}
                    {entry.status === "error" && "Erro"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {finished ? (
            <button className="btn-primary" onClick={onDone}>{files.some((f) => f.status === "error") ? "Fechar" : "Concluir"}</button>
          ) : (
            <button className="btn-primary" onClick={handleUpload} disabled={uploading || pendingCount === 0}>
              {uploading ? "Enviando..." : `Enviar ${pendingCount > 0 ? pendingCount : ""} arquivo${pendingCount !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Campaign/Adset selector (used in "Aguardando Upload" card) ── */
function CampanhasSelector({ campanhas, selectedAdsets, onChange }) {
  const [openCamps, setOpenCamps] = useState({});

  const toggleCamp = (campId) => setOpenCamps((p) => ({ ...p, [campId]: !p[campId] }));

  const toggleAdset = (adsetId) => {
    const next = new Set(selectedAdsets);
    next.has(adsetId) ? next.delete(adsetId) : next.add(adsetId);
    onChange(next);
  };

  const allAdsetIds = campanhas.flatMap((c) => c.adsets.map((a) => a.id));
  const allSelected = allAdsetIds.length > 0 && allAdsetIds.every((id) => selectedAdsets.has(id));

  const toggleAll = () => {
    if (allSelected) onChange(new Set());
    else onChange(new Set(allAdsetIds));
  };

  return (
    <div className="camps-selector">
      <div className="camps-select-all">
        <label className="camps-check-label">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          <span>Selecionar todos os adsets</span>
        </label>
      </div>
      {campanhas.map((camp) => {
        const campAdsets = camp.adsets.map((a) => a.id);
        const allCampSelected = campAdsets.every((id) => selectedAdsets.has(id));
        const someCampSelected = campAdsets.some((id) => selectedAdsets.has(id));
        return (
          <div key={camp.id} className="camp-group">
            <div className="camp-header">
              <label className="camps-check-label">
                <input
                  type="checkbox"
                  checked={allCampSelected}
                  ref={(el) => { if (el) el.indeterminate = !allCampSelected && someCampSelected; }}
                  onChange={() => {
                    const next = new Set(selectedAdsets);
                    if (allCampSelected) campAdsets.forEach((id) => next.delete(id));
                    else campAdsets.forEach((id) => next.add(id));
                    onChange(next);
                  }}
                />
                <span className="camp-name">{camp.name}</span>
              </label>
              <button className="camp-toggle" type="button" onClick={() => toggleCamp(camp.id)}>
                {openCamps[camp.id] ? "▲" : "▼"}
              </button>
            </div>
            {openCamps[camp.id] && (
              <div className="adset-list">
                {camp.adsets.map((adset) => (
                  <label key={adset.id} className="camps-check-label adset-item">
                    <input
                      type="checkbox"
                      checked={selectedAdsets.has(adset.id)}
                      onChange={() => toggleAdset(adset.id)}
                    />
                    <span>{adset.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Kanban Card ── */
function KanbanCard({ card, colKey, platform, campanhas, metaPages, onAction, onDragStart, selected, onToggleSelect }) {
  const isMock = card.id?.startsWith("mock");
  const isVideo = /\.(mp4|mov|avi)$/i.test(card.arquivo);
  const isMeta = platform === "meta";

  // TikTok copy
  const isPlaceholderCopy = !card.copy || card.copy === "Gerando copy..." || card.copy.startsWith("ERRO IA");
  const [editCopy, setEditCopy] = useState(isPlaceholderCopy ? "" : card.copy);
  const userEditedCopy = useRef(false);

  // Meta copy
  const [editPrimary, setEditPrimary] = useState(card.meta_primary_text || "");
  const [editHeadline, setEditHeadline] = useState(card.meta_headline || "");
  const [editDesc, setEditDesc] = useState(card.meta_description || "");

  const [editUrl, setEditUrl] = useState(card.url || "");
  const [editNome, setEditNome] = useState(card.nome_criativo || "");
  const [aiLoading, setAiLoading] = useState(false);
  const awaitingAI = useRef(false);

  // "Aguardando Upload" state
  const [selectedAdsets, setSelectedAdsets] = useState(new Set());
  const [selectedPage, setSelectedPage] = useState("");
  const [useUtm, setUseUtm] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const isReady = card.copy && card.copy !== "Gerando copy..." && !card.copy.startsWith("ERRO IA");
    if (isReady) { setAiLoading(false); if (!userEditedCopy.current) setEditCopy(card.copy); }
  }, [card.copy]); // eslint-disable-line

  useEffect(() => { setEditUrl(card.url || ""); }, [card.url]);
  useEffect(() => { setEditNome(card.nome_criativo || ""); }, [card.nome_criativo]);
  useEffect(() => {
    if (awaitingAI.current && card.meta_primary_text) { awaitingAI.current = false; setAiLoading(false); }
    setEditPrimary(card.meta_primary_text || "");
  }, [card.meta_primary_text]); // eslint-disable-line
  useEffect(() => { setEditHeadline(card.meta_headline || ""); }, [card.meta_headline]);
  useEffect(() => { setEditDesc(card.meta_description || ""); }, [card.meta_description]);

  const handleGenerateCopy = async () => {
    if (isMock) {
      if (isMeta) {
        setEditPrimary("allu: a conta digital com zero anuidade e cashback real para voce.");
        setEditHeadline("allu: sem anuidade");
        setEditDesc("Abra gratis hoje");
      } else {
        setEditCopy("allu: a conta digital com zero anuidade e cashback real para voce.");
        userEditedCopy.current = true;
      }
      return;
    }
    awaitingAI.current = true;
    setAiLoading(true);
    userEditedCopy.current = false;
    try { await api.generateCopy(card.id, isMeta ? "meta" : "tiktok"); }
    catch (e) { console.error(e); awaitingAI.current = false; setAiLoading(false); }
  };

  const handlePreparar = () => {
    if (!editUrl) { alert("Preencha a URL de destino antes de preparar o upload."); return; }
    if (isMeta) {
      onAction("aprovar", card, {
        url: editUrl,
        metaCopy: { meta_primary_text: editPrimary, meta_headline: editHeadline, meta_description: editDesc },
      });
    } else {
      onAction("aprovar", card, { copy: editCopy, url: editUrl });
    }
  };

  const handlePublicar = async () => {
    if (selectedAdsets.size === 0) { alert("Selecione pelo menos um adset."); return; }
    if (isMeta && !selectedPage) { alert("Selecione a Pagina do Facebook/Instagram."); return; }
    setPublishing(true);
    await onAction("publicar", card, {
      use_utm: useUtm,
      platform: isMeta ? "meta" : "tiktok",
      adset_ids: Array.from(selectedAdsets),
      page_id: selectedPage || null,
    });
    setPublishing(false);
  };

  return (
    <div
      className={`card${selected ? " card-selected" : ""}`}
      draggable
      onDragStart={() => onDragStart({ card, editCopy, editUrl })}
    >
      <div className="card-file-header">
        <input type="checkbox" className="card-checkbox" checked={selected} onChange={onToggleSelect} onClick={(e) => e.stopPropagation()} />
        <div className="card-file-icon">{isVideo ? <IcoVideo /> : <IcoImage />}</div>
        <span className="card-filename" title={card.arquivo}>{card.arquivo}</span>
        <button className="btn-delete-card" onClick={() => onAction("deletar", card)} title="Excluir card"><IcoTrash /></button>
      </div>

      <div className="card-field">
        <label className="card-label">Nome do Criativo</label>
        <input className="card-input" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
      </div>

      {/* ── FILA ── */}
      {colKey === "fila" && (
        <>
          {isMeta ? (
            /* Meta: 3 copy fields */
            <>
              <div className="card-field">
                <label className="card-label">
                  Texto Principal <span className="copy-limit">125 chars</span>
                  <button className="btn-ai" onClick={handleGenerateCopy} disabled={aiLoading}>
                    {aiLoading ? <span className="ai-btn-spinner" /> : <IcoRobot />}
                    {aiLoading ? "Gerando..." : "Gerar com IA"}
                  </button>
                </label>
                <div className="ai-field-wrap">
                  <textarea
                    className="card-input card-textarea"
                    rows={3} disabled={aiLoading}
                    placeholder="Texto principal (max 125)"
                    value={aiLoading ? "" : editPrimary}
                    onChange={(e) => setEditPrimary(e.target.value.slice(0, 125))}
                  />
                  {aiLoading && <div className="ai-field-overlay"><div className="ai-spinner" /></div>}
                </div>
                <div className="card-char-count">{editPrimary.length}/125</div>
              </div>
              <div className="card-field">
                <label className="card-label">Titulo <span className="copy-limit">40 chars</span></label>
                <div className="ai-field-wrap">
                  <input className="card-input" placeholder="Titulo (max 40)" disabled={aiLoading}
                    value={aiLoading ? "" : editHeadline}
                    onChange={(e) => setEditHeadline(e.target.value.slice(0, 40))} />
                  {aiLoading && <div className="ai-field-overlay"><div className="ai-spinner" /></div>}
                </div>
                <div className="card-char-count">{editHeadline.length}/40</div>
              </div>
              <div className="card-field">
                <label className="card-label">Descricao <span className="copy-limit">30 chars</span></label>
                <div className="ai-field-wrap">
                  <input className="card-input" placeholder="Descricao (max 30)" disabled={aiLoading}
                    value={aiLoading ? "" : editDesc}
                    onChange={(e) => setEditDesc(e.target.value.slice(0, 30))} />
                  {aiLoading && <div className="ai-field-overlay"><div className="ai-spinner" /></div>}
                </div>
                <div className="card-char-count">{editDesc.length}/30</div>
              </div>
            </>
          ) : (
            /* TikTok: single copy */
            <div className="card-field">
              <label className="card-label">
                Copy
                <button className="btn-ai" onClick={handleGenerateCopy} disabled={aiLoading}>
                  {aiLoading ? <span className="ai-btn-spinner" /> : <IcoRobot />}
                  {aiLoading ? "Gerando..." : "Gerar com IA"}
                </button>
              </label>
              <div className="ai-field-wrap">
                <textarea
                  className="card-input card-textarea"
                  rows={3} disabled={aiLoading}
                  placeholder="Escreva a copy ou clique em Gerar com IA"
                  value={aiLoading ? "" : editCopy}
                  onChange={(e) => { userEditedCopy.current = true; setEditCopy(e.target.value.slice(0, 120)); }}
                />
                {aiLoading && <div className="ai-field-overlay"><div className="ai-spinner" /></div>}
              </div>
              <div className="card-char-count">{editCopy.length}/120</div>
            </div>
          )}
          <div className="card-field">
            <label className="card-label">URL de Destino</label>
            <input className="card-input" type="url" placeholder="https://..." value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
          </div>
          <div className="card-actions">
            <button className="btn-approve" onClick={handlePreparar}>Preparar Upload →</button>
            <button className="btn-reject" onClick={() => onAction("rejeitar", card)}>Rejeitar</button>
          </div>
        </>
      )}

      {/* ── AGUARDANDO UPLOAD ── */}
      {colKey === "upload" && (
        <>
          {/* Copy preview */}
          {isMeta ? (
            <div className="meta-copy-preview">
              {card.meta_primary_text && <div className="meta-copy-field"><span className="meta-copy-label">Texto</span><p>{card.meta_primary_text}</p></div>}
              {card.meta_headline && <div className="meta-copy-field"><span className="meta-copy-label">Titulo</span><p>{card.meta_headline}</p></div>}
              {card.meta_description && <div className="meta-copy-field"><span className="meta-copy-label">Desc</span><p>{card.meta_description}</p></div>}
            </div>
          ) : (
            card.copy && !card.copy.startsWith("ERRO") && <div className="copy-text">{card.copy}</div>
          )}

          {card.url && <div className="card-url-display" title={card.url}>{card.url}</div>}

          {/* Campaign/Adset selectors */}
          {campanhas.length > 0 && (
            <div className="card-field" style={{ marginTop: 10 }}>
              <label className="card-label">Campanhas e Adsets</label>
              <CampanhasSelector campanhas={campanhas} selectedAdsets={selectedAdsets} onChange={setSelectedAdsets} />
            </div>
          )}

          {/* Meta-only: page selector */}
          {isMeta && metaPages.length > 0 && (
            <div className="card-field">
              <label className="card-label">Pagina Facebook / Instagram <span style={{ color: "#E53E3E" }}>*</span></label>
              <select
                className="card-input"
                value={selectedPage}
                onChange={(e) => setSelectedPage(e.target.value)}
              >
                <option value="">Selecione uma pagina...</option>
                {metaPages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* UTM checkbox */}
          <label className="utm-check-label">
            <input type="checkbox" checked={useUtm} onChange={(e) => setUseUtm(e.target.checked)} />
            <span>Adicionar UTMs padrao da rede</span>
          </label>

          <button className="btn-publish" onClick={handlePublicar} disabled={publishing}>
            {publishing ? "Publicando..." : "Publicar nas Plataformas"}
          </button>
        </>
      )}

      {colKey === "subido" && (
        <div className="status-ok"><span className="dot-ok" /><span className="label-ok">Publicado</span></div>
      )}

      {colKey === "erro" && <span className="pill-erro">{card.status}</span>}
    </div>
  );
}

/* ── Bulk Action Bar ── */
function BulkBar({ selectedCards, aiGenerating, onGenerateAI, onApplyUrl, onDelete, onClear }) {
  const [bulkUrl, setBulkUrl] = useState("");
  const count = selectedCards.length;

  return (
    <div className="bulk-bar">
      <span className="bulk-count">{count} selecionado{count !== 1 ? "s" : ""}</span>

      <div className="bulk-divider" />

      <button className="bulk-btn bulk-btn-ai" onClick={onGenerateAI} disabled={aiGenerating}>
        {aiGenerating ? <span className="ai-btn-spinner" /> : <IcoRobot />}
        {aiGenerating ? "Gerando..." : "Gerar copy com IA"}
      </button>

      <div className="bulk-divider" />

      <div className="bulk-input-group">
        <input className="bulk-input" placeholder="URL para todos" type="url" value={bulkUrl} onChange={(e) => setBulkUrl(e.target.value)} />
      </div>

      <div className="bulk-divider" />

      <button className="bulk-btn bulk-btn-approve" disabled={!bulkUrl.trim()} onClick={() => { onApplyUrl(bulkUrl.trim()); setBulkUrl(""); }}>
        Preparar para Upload →
      </button>

      <div className="bulk-divider" />

      <button className="bulk-btn bulk-btn-delete" onClick={onDelete}><IcoTrash /> Excluir</button>

      <button className="bulk-btn-clear" onClick={onClear} title="Limpar selecao">✕</button>
    </div>
  );
}

/* ── Main Kanban ── */
export default function Kanban({ platform = "tiktok" }) {
  const [criativos, setCriativos] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [campanhas, setCampanhas] = useState([]);
  const [metaPages, setMetaPages] = useState([]);
  const [bulkAiGenerating, setBulkAiGenerating] = useState(false);
  const dragData = useRef(null);

  const carregar = (silent = false) => {
    if (!silent) setRefreshing(true);
    api.listarCriativos(platform)
      .then((d) => {
        if (Array.isArray(d)) { setCriativos(d.map((c) => ({ ...c, id: String(c.id) }))); }
      })
      .catch(() => {})
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    carregar(false);
    const poll = setInterval(() => carregar(true), 4000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    api.getCampanhas(platform).then((d) => { if (Array.isArray(d)) setCampanhas(d); }).catch(() => {});
    if (platform === "meta") {
      api.getMetaPages().then((d) => { if (Array.isArray(d)) setMetaPages(d); }).catch(() => {});
    }
  }, [platform]);

  const handleCardCreated = (card) => {
    setApiConnected(true);
    setCriativos((prev) => {
      const newCard = { ...card, id: String(card.id) };
      const realCards = prev.filter((c) => !c.id.startsWith("mock"));
      if (realCards.some((c) => c.id === newCard.id)) return realCards;
      return [...realCards, newCard];
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleAction = async (type, card, data = {}) => {
    if (type === "deletar") {
      if (!window.confirm("Excluir este card permanentemente?")) return;
      await api.deletar(card.id).catch(console.error);
      setCriativos((p) => p.filter((c) => c.id !== card.id));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(card.id); return n; });
      return;
    }
    if (type === "aprovar") {
      if (!data.url) { alert("Preencha a URL de destino."); return; }
      await api.aprovar(card.id, data.url, data.copy || null, data.metaCopy || null).catch(console.error);
    } else if (type === "rejeitar") {
      await api.rejeitar(card.id).catch(console.error);
    } else if (type === "publicar") {
      await api.publicar(card.id, data).catch(console.error);
    }
    carregar(true);
  };

  const selectedCards = criativos.filter((c) => selectedIds.has(c.id));

  const handleBulkGenerateAI = async () => {
    const targets = selectedCards.filter((c) => !c.copy_aprovada && !c.id.startsWith("mock"));
    setBulkAiGenerating(true);
    await Promise.all(targets.map((c) => api.generateCopy(c.id, platform === "meta" ? "meta" : "tiktok").catch(console.error)));
    setBulkAiGenerating(false);
  };

  const handleBulkApproveWithUrl = async (url) => {
    const targets = selectedCards.filter((c) => !c.copy_aprovada && !c.id.startsWith("mock"));
    if (!targets.length) { alert("Nenhum card da Fila selecionado para aprovar."); return; }
    await Promise.all(targets.map((c) => api.aprovar(c.id, url, c.copy).catch(console.error)));
    setSelectedIds(new Set());
    carregar(true);
  };


  const handleBulkDelete = async () => {
    if (!window.confirm(`Excluir ${selectedIds.size} card(s) permanentemente?`)) return;
    const realTargets = selectedCards.filter((c) => !c.id.startsWith("mock"));
    await Promise.all(realTargets.map((c) => api.deletar(c.id).catch(console.error)));
    setCriativos((p) => p.filter((c) => !selectedIds.has(c.id)));
    setSelectedIds(new Set());
  };

  const handleDragStart = (data) => { dragData.current = data; };
  const handleDrop = (colKey) => {
    setDragOverCol(null);
    if (!dragData.current) return;
    const { card, editCopy, editUrl } = dragData.current;
    dragData.current = null;
    if (colKey === "upload") handleAction("aprovar", card, { copy: editCopy, url: editUrl });
    else if (colKey === "subido") handleAction("publicar", card, { platform });
    else if (colKey === "erro") handleAction("rejeitar", card);
  };

  const platformLabel = platform === "meta" ? "Meta Ads" : "TikTok Ads";

  return (
    <div className="page">
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onDone={() => { setShowUpload(false); carregar(true); }}
          onCardCreated={handleCardCreated}
          platform={platform}
        />
      )}

      <div className="toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Criativos — {platformLabel}</h1>
          {refreshing && <span className="toolbar-meta">Carregando...</span>}
        </div>
        <div className="toolbar-right">
          <button className="btn-secondary" onClick={() => carregar(true)} disabled={refreshing}>Atualizar</button>
          <button className="btn-primary" onClick={() => setShowUpload(true)}>+ Novo Criativo</button>
        </div>
      </div>

      <div className="kanban">
        {COLUMNS.map((col) => {
          const cards = criativos.filter(col.filter);
          const isTarget = dragOverCol === col.key;
          return (
            <div
              key={col.key}
              className={`kanban-col${isTarget ? " kanban-col-drag-target" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => handleDrop(col.key)}
            >
              <div className="kanban-col-header">
                <span className="kanban-col-title">{col.label}</span>
                <span className={`kanban-col-badge ${col.badge}`}>{cards.length}</span>
              </div>
              <div className="kanban-col-body">
                {cards.length === 0 ? (
                  <p className="kanban-empty">{isTarget ? "Soltar aqui" : "Vazio"}</p>
                ) : (
                  cards.map((c) => (
                    <KanbanCard
                      key={c.id}
                      card={c}
                      colKey={col.key}
                      platform={platform}
                      campanhas={campanhas}
                      metaPages={metaPages}
                      onAction={handleAction}
                      onDragStart={handleDragStart}
                      selected={selectedIds.has(c.id)}
                      onToggleSelect={() => toggleSelect(c.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedIds.size > 0 && (
        <BulkBar
          selectedCards={selectedCards}
          aiGenerating={bulkAiGenerating}
          onGenerateAI={handleBulkGenerateAI}
          onApplyUrl={handleBulkApproveWithUrl}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}
