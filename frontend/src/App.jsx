import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard.jsx";
import EvidenceForm from "./pages/EvidenceForm.jsx";
import EvidenceList from "./pages/EvidenceList.jsx";
import SmartQuery from "./pages/SmartQuery.jsx";
import AuditLog from "./pages/AuditLog.jsx";
import Integraciones from "./pages/Integraciones.jsx";
import { trackNavegacion } from "./services/tracker.js";

const sections = [
  { id: "dashboard", label: "Resumen" },
  { id: "new", label: "Registrar evidencia" },
  { id: "list", label: "Repositorio" },
  { id: "query", label: "Consulta inteligente" },
  { id: "audit", label: "Bitácora" },
  { id: "integraciones", label: "Integraciones" },
];

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    document.body.dataset.seccion = active;
    const etiqueta = sections.find((s) => s.id === active)?.label || active;
    trackNavegacion(active, etiqueta);
  }, [active]);

  const onCreated = () => { setRefresh((v) => v + 1); setActive("list"); };

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>Portal de evidencias</h1>
        <p>Prototipo TFM · Ciberseguridad</p>
        <nav>
          {sections.map((s) => (
            <button key={s.id} className={active === s.id ? "active" : ""} onClick={() => setActive(s.id)}>{s.label}</button>
          ))}
        </nav>
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
