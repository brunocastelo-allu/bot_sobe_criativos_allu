import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import Kanban from "./pages/Kanban";
import Insights from "./pages/Insights";
import Settings from "./pages/Settings";
import "./App.css";

const AlluLogo = () => (
  <svg width="68" height="27" viewBox="0 0 4292 1731" fill="none">
    <path d="M1835.8 0H1647.44C1616.09 0 1590.68 25.2 1590.68 56.3V1674.4C1590.68 1705.4 1616.09 1730.6 1647.44 1730.6H1835.8C1867.15 1730.6 1892.57 1705.4 1892.57 1674.4V56.3C1892.57 25.2 1867.15 0 1835.8 0Z" fill="#2E2F39"/>
    <path d="M2363.24 0H2174.89C2143.54 0 2118.12 25.2 2118.12 56.3V1674.4C2118.12 1705.4 2143.54 1730.6 2174.89 1730.6H2363.24C2394.6 1730.6 2420.01 1705.4 2420.01 1674.4V56.3C2420.01 25.2 2394.6 0 2363.24 0Z" fill="#2E2F39"/>
    <path d="M2898.53 402C2929.9 402 2955.3 427.2 2955.3 458.3V1161.5C2955.3 1314.8 3080.56 1438.9 3227.83 1438.9C3382.52 1438.9 3507.78 1314.8 3507.78 1161.5V458.3C3507.78 427.2 3533.17 402 3564.54 402H3752.9C3784.27 402 3809.67 427.2 3809.67 458.3V1154.1C3809.67 1475.5 3551.95 1731 3227.83 1731C2911.19 1731 2646 1475.5 2646 1154.1V458.3C2646 427.2 2671.39 402 2702.76 402H2898.53Z" fill="#2E2F39"/>
    <path d="M704.649 372.9C319.301 360.8 0 672 0 1051.5C0 1431 310.308 1730.6 685.943 1730.6C817.678 1730.6 954.665 1691.8 1052.15 1626.4C1059.71 1621.3 1069.85 1626.6 1069.85 1635.6V1674.4C1069.85 1705.5 1095.25 1730.6 1126.62 1730.6H1307.42C1338.79 1730.6 1364.19 1705.5 1364.19 1674.4V1055.3C1364.19 689.4 1073.52 384.4 704.649 372.9ZM686.878 1431.3C473.268 1431.3 303.904 1263.3 303.904 1051.5C303.904 839.7 473.268 671.8 686.878 671.8C900.489 671.8 1069.85 839.8 1069.85 1051.5C1069.85 1263.3 900.489 1431.3 686.878 1431.3Z" fill="#2E2F39"/>
    <path d="M4095.94 1730.6C4201.56 1730.6 4292 1648.4 4292 1536.3C4292 1431.6 4201.56 1349.4 4095.94 1349.4C3990.33 1349.4 3899.89 1431.6 3899.89 1536.3C3899.89 1648.4 3990.4 1730.6 4095.94 1730.6Z" fill="#27AE60"/>
  </svg>
);

const IcoTikTok = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.5a8.16 8.16 0 0 0 4.77 1.52V7.55a4.85 4.85 0 0 1-1-.86z"/>
  </svg>
);
const IcoMeta = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M12 12c-2-2.6-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.4 6-4z"/>
    <path d="M12 12c2 2.6 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.4-6 4z"/>
  </svg>
);
const IcoSettings = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IcoChevron = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

function SidebarSection({ icon, label, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="sidebar-section">
      <button className="sidebar-group" onClick={() => setOpen(!open)}>
        <span className="sidebar-group-icon">{icon}</span>
        <span className="sidebar-group-label">{label}</span>
        <span className={`sidebar-chevron${open ? " open" : ""}`}><IcoChevron /></span>
      </button>
      {open && <div className="sidebar-items">{children}</div>}
    </div>
  );
}

function ComingSoon({ platform, page }) {
  return (
    <div className="page">
      <div className="toolbar"><h1>{platform} — {page}</h1></div>
      <div className="coming-soon">
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27AE60", margin: "0 auto" }} />
        <h2>Em breve</h2>
        <p>Esta integracao ainda nao esta disponivel.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo"><AlluLogo /></div>
          <nav className="sidebar-nav">
            <SidebarSection icon={<IcoTikTok />} label="TikTok Ads" defaultOpen>
              <NavLink to="/tiktok/criativos" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>Criativos</NavLink>
              <NavLink to="/tiktok/insights" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>Insights</NavLink>
            </SidebarSection>
            <SidebarSection icon={<IcoMeta />} label="Meta Ads" defaultOpen={false}>
              <NavLink to="/meta/criativos" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>Criativos</NavLink>
              <NavLink to="/meta/insights" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>Insights</NavLink>
            </SidebarSection>
          </nav>
          <div className="sidebar-bottom">
            <NavLink to="/settings" className={({ isActive }) => "sidebar-settings" + (isActive ? " active" : "")}>
              <IcoSettings /> Configuracoes
            </NavLink>
          </div>
        </aside>

        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/tiktok/criativos" replace />} />
            <Route path="/tiktok/criativos" element={<Kanban key="tiktok" />} />
            <Route path="/tiktok/insights" element={<Insights platform="tiktok" />} />
            <Route path="/meta/criativos" element={<Kanban key="meta" platform="meta" />} />
            <Route path="/meta/insights" element={<ComingSoon platform="Meta Ads" page="Insights" />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
