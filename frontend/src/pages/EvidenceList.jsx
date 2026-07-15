import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api.js";

export default function EvidenceList({ refresh }) {
  const [items, setItems] = useState([]);
  const [area, setArea] = useState("");
  const [estado, setEstado] = useState("");
  const [texto, setTexto] = useState("");

  useEffect(() => {
    api.getEvidencias().then(setItems).catch(console.error);
  }, [refresh]);

  const areas = useMemo(() => [...new Set(items.map((i) => i.area).filter(Boolean))], [items]);
  const estados = useMemo(() => [...new Set(items.map((i) => i.estado).filter(Boolean))], [items]);

  const filtered = useMemo(() => {
    const q = texto.toLowerCase();
    return items.filter((i) => {
      const coincideArea = !area || i.area === area;
      const coincideEstado = !estado || i.estado === estado;
      const coincideTexto = !q || [i.titulo, i.area, i.categoria, i.responsable, i.estado, i.descripcion]
        .join(" ").toLowerCase().includes(q);
      return coincideArea && coincideEstado && coincideTexto;
    });
  }, [items, area, estado, texto]);

  return (
    <section>
      <h2>Repositorio de evidencias</h2>
      <p className="lead">Filtrado estructurado por área y estado, complementado con búsqueda por texto.</p>

      <div className="filtros">
        <label>Área
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Todas</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label>Estado
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            {estados.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="grow">Búsqueda
          <input placeholder="Filtrar por título, categoría o responsable..." value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
      </div>

      <div className="list">
        {filtered.map((item) => (
          <article className="card evidence" key={item.id}>
            <div>
              <h3>{item.titulo}</h3>
              <p>{item.descripcion}</p>
              <small>{item.area} · {item.categoria} · {item.responsable} · {item.fecha}</small>
            </div>
            <span className="badge">{item.estado}</span>
          </article>
        ))}
        {filtered.length === 0 && <p className="empty">No hay evidencias que coincidan con los filtros seleccionados.</p>}
      </div>
    </section>
  );
}
