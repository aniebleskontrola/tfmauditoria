import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api.js";

const TIPOS = ["", "sistema", "navegacion", "click", "accion", "consulta", "api"];

export default function AuditLog({ refresh }) {
  const [logs, setLogs] = useState([]);
  const [origen, setOrigen] = useState("");
  const [tipo, setTipo] = useState("");
  const [texto, setTexto] = useState("");

  const cargar = useCallback(() => {
    api.getBitacora({ origen, tipo, q: texto, limit: 300 }).then(setLogs).catch(console.error);
  }, [origen, tipo, texto]);

  useEffect(() => { cargar(); }, [cargar, refresh]);

  const origenes = [...new Set(logs.map((l) => l.origen).filter(Boolean))];

  return (
    <section>
      <h2>Bitácora de auditoría</h2>
      <p className="lead">Registro unificado de todos los movimientos del portal y de los sistemas externos conectados (p. ej. Kontrola).</p>

      <div className="filtros">
        <label className="grow">Buscar
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Acción, detalle o usuario" />
        </label>
        <label>Origen
          <select value={origen} onChange={(e) => setOrigen(e.target.value)}>
            <option value="">Todos</option>
            {origenes.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label>Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => <option key={t} value={t}>{t || "Todos"}</option>)}
          </select>
        </label>
        <button type="button" onClick={cargar}>Actualizar</button>
      </div>

      <div className="card">
        {logs.length === 0 && <p className="empty">No hay eventos que coincidan con el filtro.</p>}
        {logs.map((log) => (
          <div className="log" key={log.id}>
            <div className="result-head">
              <strong>{log.accion}</strong>
              <span className={`origen-tag origen-${log.origen}`}>{log.origen} · {log.tipo}</span>
            </div>
            <p>{log.detalle}</p>
            <small>{new Date(log.fecha).toLocaleString()} · {log.usuario}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
