import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "..", "data", "evidencias.json");
const app = express();
const PORT = process.env.PORT || 4000;
let auditLog = [{ id: 1, fecha: new Date().toISOString(), accion: "Inicio del sistema", usuario: "sistema", detalle: "Carga inicial del prototipo" }];

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

const readEvidences = () => JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
const writeEvidences = (items) => fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), "utf-8");
const addLog = (accion, usuario, detalle) => auditLog.unshift({ id: auditLog.length + 1, fecha: new Date().toISOString(), accion, usuario, detalle });

// ---------------------------------------------------------------------------
// Motor de consulta inteligente: TF-IDF + similitud coseno
// ---------------------------------------------------------------------------
const STOPWORDS = new Set([
  "de", "la", "el", "los", "las", "un", "una", "unos", "unas", "y", "o", "u",
  "a", "ante", "con", "sin", "sobre", "en", "del", "al", "que", "por", "para",
  "se", "su", "sus", "lo", "le", "les", "es", "son", "como", "mas", "este",
  "esta", "estos", "estas", "ese", "esa", "esos", "esas", "me", "mi", "tu",
  "cual", "cuales", "donde", "cuando", "quien", "the", "of",
]);

const normalizar = (t) => (t ?? "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// Raíz ligera en español: elimina plurales para agrupar términos (accesos -> acceso).
const raiz = (w) => w.replace(/(ces)$/, "z").replace(/(es)$/, "").replace(/s$/, "");
const tokenizar = (t) => normalizar(t)
  .split(/[^a-z0-9]+/)
  .filter((w) => w.length > 1 && !STOPWORDS.has(w))
  .map(raiz)
  .filter(Boolean);

const evidenceText = (e) => [e.titulo, e.area, e.categoria, e.responsable, e.estado, e.descripcion, ...(e.etiquetas || [])].join(" ");

function buildTfidf(items) {
  const docsTokens = items.map((e) => tokenizar(evidenceText(e)));
  const N = items.length || 1;
  const df = {};
  docsTokens.forEach((toks) => [...new Set(toks)].forEach((t) => { df[t] = (df[t] || 0) + 1; }));
  const idf = {};
  Object.keys(df).forEach((t) => { idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1; });
  const vectors = docsTokens.map((toks) => toVector(toks, idf));
  return { idf, vectors, docsTokens };
}

function toVector(tokens, idf) {
  const counts = {};
  tokens.forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
  const total = tokens.length || 1;
  const vec = {};
  Object.keys(counts).forEach((w) => { if (idf[w]) vec[w] = (counts[w] / total) * idf[w]; });
  return vec;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const k in a) { na += a[k] * a[k]; if (b[k]) dot += a[k] * b[k]; }
  for (const k in b) nb += b[k] * b[k];
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Capa de decisión: sugiere una acción según el estado de la evidencia priorizada.
const ACCIONES = {
  "Pendiente": "Se recomienda priorizar su revisión y completar la documentación asociada.",
  "En revisión": "Está en proceso de validación; conviene verificar su estado antes de utilizarla.",
  "En revisi\u00f3n": "Está en proceso de validación; conviene verificar su estado antes de utilizarla.",
  "Aprobada": "Puede utilizarse como soporte válido para el proceso de auditoría.",
  "Rechazada": "No debe utilizarse como soporte; requiere corrección o reemplazo.",
};

function analizarConsulta(pregunta, items) {
  const { idf, vectors } = buildTfidf(items);
  const queryTokens = tokenizar(pregunta);
  const queryVec = toVector(queryTokens, idf);
  const queryTokenSet = new Set(queryTokens);

  const resultados = items
    .map((e, i) => {
      const score = cosine(queryVec, vectors[i]);
      const coincidencias = [...new Set(tokenizar(evidenceText(e)).filter((t) => queryTokenSet.has(t)))];
      return { ...e, puntuacion: Math.round(score * 1000) / 10, coincidencias };
    })
    .filter((e) => e.puntuacion > 0)
    .sort((a, b) => b.puntuacion - a.puntuacion);

  const areasDetectadas = [...new Set(resultados.map((r) => r.area).filter(Boolean))];
  const categoriasDetectadas = [...new Set(resultados.map((r) => r.categoria).filter(Boolean))];

  let resumen;
  let recomendacion = null;
  if (resultados.length === 0) {
    resumen = "No se identificaron evidencias relacionadas con la consulta. Se recomienda reformular los términos de búsqueda o registrar la evidencia correspondiente.";
  } else {
    const top = resultados[0];
    const accion = ACCIONES[top.estado] || "Revise el registro para confirmar su pertinencia.";
    const aprobadas = resultados.filter((r) => r.estado === "Aprobada").length;
    resumen = `Se identificaron ${resultados.length} evidencias relacionadas (${aprobadas} aprobadas). La más pertinente es “${top.titulo}” (${top.area}, estado ${top.estado}, relevancia ${top.puntuacion}%).`;
    recomendacion = {
      evidenciaId: top.id,
      titulo: top.titulo,
      area: top.area,
      estado: top.estado,
      relevancia: top.puntuacion,
      motivo: top.coincidencias.length
        ? `Coincide con los términos: ${top.coincidencias.join(", ")}.`
        : "Es el registro con mayor similitud textual respecto a la consulta.",
      accionSugerida: accion,
    };
  }

  return {
    pregunta,
    interpretacion: { areasDetectadas, categoriasDetectadas, terminos: queryTokens },
    total: resultados.length,
    resumen,
    recomendacion,
    resultados,
  };
}

// ---------------------------------------------------------------------------
// Rutas de la API
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/evidencias", (_req, res) => res.json(readEvidences()));

app.post("/api/evidencias", (req, res) => {
  const { titulo, area, categoria, responsable, descripcion, etiquetas } = req.body;
  let { estado, fecha } = req.body;
  if (!titulo || !area || !categoria || !responsable || !descripcion) {
    return res.status(400).json({ message: "Los campos título, área, categoría, responsable y descripción son obligatorios." });
  }
  estado = estado || "Pendiente";
  fecha = fecha || new Date().toISOString().slice(0, 10);
  const items = readEvidences();
  const newEvidence = {
    id: items.length ? Math.max(...items.map((e) => e.id)) + 1 : 1,
    titulo, area, categoria, responsable, estado, fecha, descripcion,
    etiquetas: String(etiquetas || "").split(",").map((t) => t.trim()).filter(Boolean),
  };
  items.unshift(newEvidence);
  writeEvidences(items);
  addLog("Registro de evidencia", responsable, `Se registró la evidencia: ${titulo}`);
  res.status(201).json(newEvidence);
});

app.post("/api/consulta-inteligente", (req, res) => {
  const { pregunta } = req.body;
  if (!pregunta || pregunta.trim().length < 3) return res.status(400).json({ message: "La consulta debe contener al menos 3 caracteres." });
  const analisis = analizarConsulta(pregunta.trim(), readEvidences());
  addLog("Consulta inteligente", "auditor", `Consulta realizada: ${pregunta} (${analisis.total} resultados)`);
  res.json(analisis);
});

app.get("/api/bitacora", (_req, res) => res.json(auditLog));

app.get("/api/resumen", (_req, res) => {
  const items = readEvidences();
  const estados = items.reduce((acc, e) => { acc[e.estado] = (acc[e.estado] || 0) + 1; return acc; }, {});
  res.json({
    total: items.length,
    estados,
    areas: [...new Set(items.map((e) => e.area).filter(Boolean))],
    categorias: [...new Set(items.map((e) => e.categoria))],
  });
});

app.listen(PORT, () => console.log(`API disponible en http://localhost:${PORT}`));
