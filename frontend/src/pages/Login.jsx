import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";

const AlluLogo = () => (
  <svg width="80" height="32" viewBox="0 0 4292 1731" fill="none">
    <path d="M1835.8 0H1647.44C1616.09 0 1590.68 25.2 1590.68 56.3V1674.4C1590.68 1705.4 1616.09 1730.6 1647.44 1730.6H1835.8C1867.15 1730.6 1892.57 1705.4 1892.57 1674.4V56.3C1892.57 25.2 1867.15 0 1835.8 0Z" fill="#2E2F39"/>
    <path d="M2363.24 0H2174.89C2143.54 0 2118.12 25.2 2118.12 56.3V1674.4C2118.12 1705.4 2143.54 1730.6 2174.89 1730.6H2363.24C2394.6 1730.6 2420.01 1705.4 2420.01 1674.4V56.3C2420.01 25.2 2394.6 0 2363.24 0Z" fill="#2E2F39"/>
    <path d="M2898.53 402C2929.9 402 2955.3 427.2 2955.3 458.3V1161.5C2955.3 1314.8 3080.56 1438.9 3227.83 1438.9C3382.52 1438.9 3507.78 1314.8 3507.78 1161.5V458.3C3507.78 427.2 3533.17 402 3564.54 402H3752.9C3784.27 402 3809.67 427.2 3809.67 458.3V1154.1C3809.67 1475.5 3551.95 1731 3227.83 1731C2911.19 1731 2646 1475.5 2646 1154.1V458.3C2646 427.2 2671.39 402 2702.76 402H2898.53Z" fill="#2E2F39"/>
    <path d="M704.649 372.9C319.301 360.8 0 672 0 1051.5C0 1431 310.308 1730.6 685.943 1730.6C817.678 1730.6 954.665 1691.8 1052.15 1626.4C1059.71 1621.3 1069.85 1626.6 1069.85 1635.6V1674.4C1069.85 1705.5 1095.25 1730.6 1126.62 1730.6H1307.42C1338.79 1730.6 1364.19 1705.5 1364.19 1674.4V1055.3C1364.19 689.4 1073.52 384.4 704.649 372.9ZM686.878 1431.3C473.268 1431.3 303.904 1263.3 303.904 1051.5C303.904 839.7 473.268 671.8 686.878 671.8C900.489 671.8 1069.85 839.8 1069.85 1051.5C1069.85 1263.3 900.489 1431.3 686.878 1431.3Z" fill="#2E2F39"/>
    <path d="M4095.94 1730.6C4201.56 1730.6 4292 1648.4 4292 1536.3C4292 1431.6 4201.56 1349.4 4095.94 1349.4C3990.33 1349.4 3899.89 1431.6 3899.89 1536.3C3899.89 1648.4 3990.4 1730.6 4095.94 1730.6Z" fill="#27AE60"/>
  </svg>
);

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", nome: "", confirm: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await api.login(form.email, form.password).catch(() => null);
    setLoading(false);
    if (res?.access_token) {
      login(res.access_token, { email: form.email.trim().toLowerCase(), nome: res.nome || "" });
      navigate("/tiktok/criativos", { replace: true });
    } else {
      setError(res?.detail || "Email ou senha incorretos.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("As senhas não conferem."); return; }
    setLoading(true);
    let res = null;
    try {
      const r = await api.register(form.email, form.password, form.nome);
      res = r;
    } catch (err) {
      setLoading(false);
      setError("Erro de conexão com o servidor.");
      return;
    }
    setLoading(false);
    if (res?.message) {
      setSuccess("Conta criada! Faça login para continuar.");
      setTab("login");
      setForm((f) => ({ ...f, password: "", confirm: "", nome: "" }));
    } else {
      setError(res?.detail || "Erro ao criar conta.");
    }
  };

  const switchTab = (t) => { setTab(t); setError(""); setSuccess(""); };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo"><AlluLogo /></div>
        <p className="login-subtitle">Gestao de criativos</p>

        <div className="login-tabs">
          <button className={"login-tab" + (tab === "login" ? " active" : "")} onClick={() => switchTab("login")}>
            Entrar
          </button>
          <button className={"login-tab" + (tab === "register" ? " active" : "")} onClick={() => switchTab("register")}>
            Criar conta
          </button>
        </div>

        {success && <p className="login-success">{success}</p>}

        {tab === "login" ? (
          <form className="login-form" onSubmit={handleLogin}>
            <input className="login-input" type="email" placeholder="seu@allugator.com"
              value={form.email} onChange={set("email")} required autoFocus />
            <input className="login-input" type="password" placeholder="Senha"
              value={form.password} onChange={set("password")} required />
            {error && <p className="login-error">{error}</p>}
            <button className="btn-primary login-btn" type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleRegister}>
            <input className="login-input" type="text" placeholder="Nome"
              value={form.nome} onChange={set("nome")} />
            <input className="login-input" type="email" placeholder="seu@allugator.com"
              value={form.email} onChange={set("email")} required />
            <input className="login-input" type="password" placeholder="Senha (min. 8 caracteres)"
              value={form.password} onChange={set("password")} required />
            <input className="login-input" type="password" placeholder="Confirmar senha"
              value={form.confirm} onChange={set("confirm")} required />
            {error && <p className="login-error">{error}</p>}
            <button className="btn-primary login-btn" type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar conta"}
            </button>
          </form>
        )}

        <p className="login-domain-hint">Acesso restrito a emails @allugator.com</p>
      </div>
    </div>
  );
}
