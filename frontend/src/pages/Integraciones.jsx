import { useEffect, useState } from "react";
import { api, API_URL } from "../services/api.js";

const EJEMPLO_CURL = (apiKey) => `curl -X POST ${API_URL}/integracion/eventos \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey || "TU_API_KEY"}" \\
  -d '{"tipo":"click","usuario":"jperez","accion":"Clic en Kontrola","detalle":"Abrió el módulo de auditoría","metadatos":{"pantalla":"dashboard"}}'`;

export default function Integraciones() {
  const [apiKey, setApiKey] = useState("demo-kontrola-key");
  const [form, setForm] = useState({ tipo: "click", usuario: "jperez", accion: "Movimiento en Kontrola", detalle: "El usuario abrió el módulo de riesgos" });
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);

  const cargarStats = () => api.getResumen().then((r) => setStats(r.eventos)).catch(console.error);
  useEffect(() => { cargarStats(); }, []);

  const enviar = async (e) => {
    e.preventDefault();
    setError(""); setResultado(null);
    try {
      const r = await api.probarIntegracion(apiKey, { ...form, metadatos: { origen_simulado: "kontrola", pantalla: "demo" } });
      setResultado(r);
      cargarStats();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section>
      <h2>Integraciones y API de auditoría</h2>
      <p className="lead">tfmauditoria funciona como un concentrador de auditoría: otros sistemas (como Kontrola) se conectan mediante una API autenticada por API key, envían cada movimiento y consultan la bitácora unificada. Además, el portal reenvía cada evento por webhook en tiempo real.</p>

      <div className="card">
        <h3>Endpoints disponibles</h3>
        <table className="tabla">
          <thead><tr><th>Método</th><th>Ruta</th><th>Descripción</th><th>Autenticación</th></tr></thead>
          <tbody>
            <tr><td>GET</td><td>/api/integracion/estado</td><td>Verifica la conexión y devuelve el resumen de eventos.</td><td>X-API-Key</td></tr>
            <tr><td>POST</td><td>/api/integracion/eventos</td><td>Ingesta de movimientos desde un sistema externo.</td><td>X-API-Key</td></tr>
            <tr><td>GET</td><td>/api/integracion/bitacora</td><td>Lectura/descarga de la bitácora unificada (con filtros).</td><td>X-API-Key</td></tr>
          </tbody>
        </table>
        <p className="lead">Filtros de lectura: <code>?origen=kontrola&amp;tipo=click&amp;usuario=jperez&amp;desde=2026-01-01&amp;q=texto&amp;limit=100</code></p>
      </div>

      <div className="grid">
        <article className="metric"><span>Eventos totales</span><strong>{stats?.total ?? "—"}</strong></article>
        {stats && Object.entries(stats.porOrigen || {}).map(([o, n]) => (
          <article className="metric" key={o}><span>Origen: {o}</span><strong>{n}</strong></article>
        ))}
      </div>

      <div className="card">
        <h3>Probador de integración (simula a Kontrola)</h3>
        <p className="lead">Envía un evento real al endpoint protegido usando la API key. Con la configuración de demostración, la clave es <code>demo-kontrola-key</code>.</p>
        <form className="form" onSubmit={enviar}>
          <label>API key
            <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="X-API-Key" />
          </label>
          <label>Tipo de evento
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {["click", "navegacion", "accion", "consulta", "api"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>Usuario
            <input value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} />
          </label>
          <label>Acción
            <input value={form.accion} onChange={(e) => setForm({ ...form, accion: e.target.value })} />
          </label>
          <label>Detalle
            <input value={form.detalle} onChange={(e) => setForm({ ...form, detalle: e.target.value })} />
          </label>
          <button type="submit">Enviar movimiento a la bitácora</button>
        </form>
        {resultado && <p className="message">Evento registrado correctamente ({resultado.registrados} evento/s). Revísalo en el módulo Bitácora filtrando por origen "kontrola".</p>}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <h3>Ejemplo de conexión (cURL)</h3>
        <pre className="codeblock">{EJEMPLO_CURL(apiKey)}</pre>
      </div>
    </section>
  );
}
