export default function Insights({ platform = "tiktok" }) {
  const name = platform === "meta" ? "Meta Ads" : "TikTok Ads";
  const metrics = ["Impressoes", "Cliques", "CTR", "CPA", "Gasto", "Resultados por Criativo"];

  return (
    <div className="page">
      <div className="toolbar"><h1>Insights — {name}</h1></div>
      <div className="coming-soon">
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27AE60", margin: "0 auto" }} />
        <h2>Aguardando aprovacao da API</h2>
        <p>Assim que o acesso a Marketing API for aprovado, as metricas aparecao aqui.</p>
        <div className="metrics-row">
          {metrics.map((m) => <span key={m} className="metric-pill">{m}</span>)}
        </div>
      </div>
    </div>
  );
}
