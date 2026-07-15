import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard.jsx";
import EvidenceForm from "./pages/EvidenceForm.jsx";
import EvidenceList from "./pages/EvidenceList.jsx";
import SmartQuery from "./pages/SmartQuery.jsx";
import AuditLog from "./pages/AuditLog.jsx";
import Integraciones from "./pages/Integraciones.jsx";
import Login from "./pages/Login.jsx";
import { api, getToken, setToken, setUnauthorizedHandler } from "./services/api.js";
import { trackNavegacion } from "./services/tracker.js";

const sections = [
  { id: "dashboard", label: "Resumen" },
  { id: "new", label: "Registrar evidencia", roles: ["administrador", "auditor"] },
  { id: "list", label: "Repositorio" },
  { id: "query", label: "Consulta inteligente" },
  { id: "audit", label: "Bitácora" },
  { id: "integraciones", label: "Integraciones" },
];

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [active, setActive] = useState("dashboard");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setUnauthorizedHandler(() => setUsuario(null));
    if (getToken()) {
      api.me().then((r) => setUsuario(r.usuario)).catch(() => setToken(null)).finally(() => setCargando(false));
    } else {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!usuario) return;
    document.body.dataset.seccion = active;
    const etiqueta = sections.find((s) => s.id === active)?.label || active;
    trackNavegacion(active, etiqueta);
  }, [active, usuario]);

  const cerrarSesion = async () => {
    await api.logout();
    setToken(null);
    setUsuario(null);
    setActive("dashboard");
  };

  const onCreated = () => { setRefresh((v) => v + 1); setActive("list"); };

  if (cargando) return <div className="login"><div className="login-card">Cargando...</div></div>;
  if (!usuario) return <Login onLogin={(u) => setUsuario(u)} />;

  const visibles = sections.filter((s) => !s.roles || s.roles.includes(usuario.rol));

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>Portal de evidencias</h1>
        <p>Prototipo TFM · Ciberseguridad</p>
        <nav>
          {visibles.map((s) => (
            <button key={s.id} className={active === s.id ? "active" : ""} onClick={() => setActive(s.id)}>{s.label}</button>
          ))}
        </nav>
        <div className="user-box">
          <span className="user-name">{usuario.nombre}</span>
          <span className="user-rol">{usuario.rol}</span>
          <button className="logout" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="content">
        {active === "dashboard" && <Dashboard refresh={refresh} />}
        {active === "new" && <EvidenceForm onCreated={onCreated} />}
        {active === "list" && <EvidenceList refresh={refresh} />}
        {active === "query" && <SmartQuery />}
        {active === "audit" && <AuditLog refresh={refresh} />}
        {active === "integraciones" && <Integraciones />}
      </main>
    </div>
  );
}
