import { useState } from "react";
import { api } from "../services/api.js";

export default function SmartQuery() {
  const [pregunta, setPregunta] = useState("");
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setResponse(null);
    setLoading(true);
    try {
      setResponse(await api.consultaInteligente(pregunta));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const rec = response?.recomendacion;

  return (
    <section>
      <h2>Consulta inteligente</h2>
      <div className="card">
        <p>
          Escribe una necesidad en lenguaje natural. El motor aplica <strong>TF-IDF y similitud coseno</strong> sobre
          los metadatos y descripciones de las evidencias, ordena por relevancia y recomienda qué registro utilizar.
        </p>
        <form className="query-form" onSubmit={submit}>
          <input value={pregunta} onChange={(e) => setPregunta(e.target.value)} placeholder="Ejemplo: evidencias de revisión de accesos administrativos" />
          <button type="submit" disabled={loading}>{loading ? "Analizando..." : "Consultar"}</button>
        </form>
        {error && <p className="message error">{error}</p>}
      </div>

      {response && (
        <>
          {rec && (
            <div className="card recomendacion">
              <h3>Recomendación del sistema</h3>
              <p className="rec-line"><strong>{rec.titulo}</strong> <span className="score">{rec.relevancia}%</span></p>
              <p>{rec.motivo}</p>
              <p className="accion">Acción sugerida: {rec.accionSugerida}</p>
              <small>Área: {rec.area} · Estado: {rec.estado}</small>
            </div>
          )}

          <div className="card">
            <h3>Resultado</h3>
            <p>{response.resumen}</p>
            {response.interpretacion?.terminos?.length > 0 && (
              <p className="interpretacion">
                Términos analizados: {response.interpretacion.terminos.map((t) => <span className="tag" key={t}>{t}</span>)}
              </p>
            )}
            {response.resultados.map((item) => (
              <article className="result" key={item.id}>
                <div className="result-head">
                  <strong>{item.titulo}</strong>
                  <span className="score">{item.puntuacion}%</span>
                </div>
                <p>{item.descripcion}</p>
                <small>{item.area} · {item.categoria} · Estado: {item.estado}</small>
                {item.coincidencias?.length > 0 && (
                  <div className="tags">{item.coincidencias.map((c) => <span className="tag" key={c}>{c}</span>)}</div>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
