import { useEffect, useState } from "react";
import { api } from "../services/api.js";

export default function Dashboard({ refresh }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.getResumen().then(setSummary).catch(console.error);
  }, [refresh]);

  if (!summary) return <section className="card">Cargando resumen...</section>;

  return (
    <section>
      <h2>Resumen del repositorio de evidencias</h2>
      <div className="grid">
        <article className="metric"><span>Total de evidencias</span><strong>{summary.total}</strong></article>
        {Object.entries(summary.estados).map(([estado, total]) => (
          <article className="metric" key={estado}><span>{estado}</span><strong>{total}</strong></article>
        ))}
      </div>
      <div className="card">
        <h3>Áreas registradas</h3>
        <p>{(summary.areas || []).join(", ") || "Sin áreas registradas"}</p>
      </div>
      <div className="card">
        <h3>Categorías registradas</h3>
        <p>{summary.categorias.join(", ")}</p>
      </div>
      {summary.eventos && (
        <div className="card">
          <h3>Movimientos auditados</h3>
          <p className="lead">Total de eventos en la bitácora: <strong>{summary.eventos.total}</strong></p>
          <div className="tags">
            {Object.entries(summary.eventos.porOrigen || {}).map(([o, n]) => (
              <span className="tag" key={o}>{o}: {n}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
