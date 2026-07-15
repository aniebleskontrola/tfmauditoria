import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "..", "data", "evidencias.json");
const AUDIT_FILE = path.join(__dirname, "..", "data", "bitacora.json");
const MAX_EVENTOS = 5000;
const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

const readEvidences = () => JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
const writeEvidences = (items) => fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), "utf-8");

// ---------------------------------------------------------------------------
// Bitácora de auditoría: persistente en disco y unificada para todos los orígenes
// (portal interno y sistemas externos conectados, p. ej. Kontrola).
// ---------------------------------------------------------------------------
const TIPOS_EVENTO = ["sistema", "navegacion", "click", "accion", "consulta", "api"];

function readAudit() {
  try {
    const data = JSON.parse(fs.readFileSync(AUDIT_FILE, "utf-8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function persistAudit() {
  try {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(auditLog, null, 2), "utf-8");
  } catch (err) {
    console.error("No se pudo persistir la bitácora:", err.message);
  }
}

let auditLog = readAudit();
if (auditLog.length === 0) {
  auditLog = [{
    id: 1,
    fecha: new Date().toISOString(),
    origen: "sistema",
    tipo: "sistema",
    usuario: "sistema",
    accion: "Inicio del sistema",
    detalle: "Carga inicial del prototipo",
    metadatos: {},
  }];
  persistAudit();
}

const nextEventId = () => auditLog.reduce((max, e) => Math.max(max, e.id || 0), 0) + 1;

// Registra un evento en la bitácora y lo reenvía a los sistemas suscritos (webhook).
function registrarEvento({ origen = "portal", tipo = "accion", usuario = "sistema", accion, detalle = "", metadatos = {}, ip = null } = {}) {
  const evento = {
    id: nextEventId(),
    fecha: new Date().toISOString(),
    origen,
    tipo: TIPOS_EVENTO.includes(tipo) ? tipo : "accion",
    usuario: usuario || "desconocido",
    accion: accion || "Evento",
    detalle,
    metadatos: metadatos || {},
    ip,
  };
  auditLog.unshift(evento);
  if (auditLog.length > MAX_EVENTOS) auditLog.length = MAX_EVENTOS;
  persistAudit();
  reenviarWebhook(evento);
  return evento;
}

// Compatibilidad con las llamadas previas del prototipo.
const addLog = (accion, usuario, detalle, extra = {}) => registrarEvento({ accion, usuario, detalle, ...extra });

// ---------------------------------------------------------------------------
// Integración con sistemas externos: autenticación por API key y webhook
// ---------------------------------------------------------------------------
function parseApiKeys() {
  const map = {};
  (process.env.AUDIT_API_KEYS || "").split(",").map((s) => s.trim()).filter(Boolean).forEach((pair) => {
    const idx = pair.indexOf(":");
    if (idx > 0) {
      const cliente = pair.slice(0, idx).trim();
      const clave = pair.slice(idx + 1).trim();
      if (cliente && clave) map[clave] = cliente;
    }
  });
  if (process.env.KONTROLA_API_KEY) map[process.env.KONTROLA_API_KEY] = "kontrola";
  if (Object.keys(map).length === 0) {
    // Clave de demostración para que el prototipo funcione sin configuración previa.
    map["demo-kontrola-key"] = "kontrola";
    console.warn("[integración] No hay API keys configuradas; se habilita la clave de demostración 'demo-kontrola-key'.");
  }
  return map;
}
const API_KEYS = parseApiKeys();

function requireApiKey(req, res, next) {
  const bearer = (req.header("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const key = req.header("X-API-Key") || bearer;
  const cliente = key && API_KEYS[key];
  if (!cliente) {
    registrarEvento({ origen: "sistema", tipo: "api", usuario: "desconocido", accion: "Acceso rechazado", detalle: "Intento de integración con API key inválida o ausente.", ip: req.ip });
    return res.status(401).json({ message: "API key inválida o ausente. Envíe el encabezado X-API-Key." });
  }
  req.cliente = cliente;
  next();
}

async function reenviarWebhook(evento) {
  const url = process.env.KONTROLA_WEBHOOK_URL;
  if (!url) return;
  try {
    const body = JSON.stringify({ fuente: "tfmauditoria", evento });
    const headers = { "Content-Type": "application/json" };
    const secret = process.env.KONTROLA_WEBHOOK_SECRET;
    if (secret) headers["X-Signature"] = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
    await fetch(url, { method: "POST", headers, body });
  } catch (err) {
    console.error("[webhook] No se pudo reenviar el evento:", err.message);
  }
}

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
  registrarEvento({ origen: "portal", tipo: "accion", usuario: responsable, accion: "Registro de evidencia", detalle: `Se registró la evidencia: ${titulo}`, metadatos: { evidenciaId: newEvidence.id, area }, ip: req.ip });
  res.status(201).json(newEvidence);
});

app.post("/api/consulta-inteligente", (req, res) => {
  const { pregunta } = req.body;
  if (!pregunta || pregunta.trim().length < 3) return res.status(400).json({ message: "La consulta debe contener al menos 3 caracteres." });
  const analisis = analizarConsulta(pregunta.trim(), readEvidences());
  registrarEvento({ origen: "portal", tipo: "consulta", usuario: "auditor", accion: "Consulta inteligente", detalle: `Consulta realizada: ${pregunta} (${analisis.total} resultados)`, metadatos: { total: analisis.total }, ip: req.ip });
  res.json(analisis);
});

// Aplica filtros de consulta (origen, tipo, usuario, rango de fechas, texto, límite).
function filtrarEventos(eventos, q) {
  let out = eventos;
  if (q.origen) out = out.filter((e) => e.origen === q.origen);
  if (q.tipo) out = out.filter((e) => e.tipo === q.tipo);
  if (q.usuario) out = out.filter((e) => (e.usuario || "").toLowerCase().includes(String(q.usuario).toLowerCase()));
  if (q.desde) { const d = new Date(q.desde); if (!isNaN(d)) out = out.filter((e) => new Date(e.fecha) >= d); }
  if (q.hasta) { const h = new Date(q.hasta); if (!isNaN(h)) out = out.filter((e) => new Date(e.fecha) <= h); }
  if (q.q) {
    const t = String(q.q).toLowerCase();
    out = out.filter((e) => `${e.accion} ${e.detalle} ${e.usuario}`.toLowerCase().includes(t));
  }
  const limit = Math.min(parseInt(q.limit, 10) || out.length, MAX_EVENTOS);
  return out.slice(0, limit);
}

function resumenEventos() {
  const porOrigen = {};
  const porTipo = {};
  auditLog.forEach((e) => {
    porOrigen[e.origen] = (porOrigen[e.origen] || 0) + 1;
    porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1;
  });
  return { total: auditLog.length, porOrigen, porTipo, ultimo: auditLog[0] || null };
}

app.get("/api/bitacora", (req, res) => res.json(filtrarEventos(auditLog, req.query)));

// Ingesta de eventos del propio portal (clics, navegación). Protegido por CORS.
app.post("/api/eventos", (req, res) => {
  const entrada = Array.isArray(req.body) ? req.body : (Array.isArray(req.body?.eventos) ? req.body.eventos : [req.body]);
  const registrados = entrada
    .filter((e) => e && (e.accion || e.tipo))
    .map((e) => registrarEvento({
      origen: "portal",
      tipo: e.tipo || "click",
      usuario: e.usuario || "usuario-portal",
      accion: e.accion || "Interacción",
      detalle: e.detalle || "",
      metadatos: e.metadatos || {},
      ip: req.ip,
    }));
  res.status(201).json({ registrados: registrados.length });
});

app.get("/api/resumen", (_req, res) => {
  const items = readEvidences();
  const estados = items.reduce((acc, e) => { acc[e.estado] = (acc[e.estado] || 0) + 1; return acc; }, {});
  res.json({
    total: items.length,
    estados,
    areas: [...new Set(items.map((e) => e.area).filter(Boolean))],
    categorias: [...new Set(items.map((e) => e.categoria))],
    eventos: resumenEventos(),
  });
});

// ---------------------------------------------------------------------------
// API de integración para sistemas externos (requiere X-API-Key)
// ---------------------------------------------------------------------------
// Verificación de credenciales / handshake.
app.get("/api/integracion/estado", requireApiKey, (req, res) => {
  res.json({
    conectado: true,
    cliente: req.cliente,
    servicio: "tfmauditoria",
    tiposEvento: TIPOS_EVENTO,
    resumen: resumenEventos(),
  });
});

// Ingesta de movimientos desde sistemas externos (p. ej. Kontrola).
app.post("/api/integracion/eventos", requireApiKey, (req, res) => {
  const entrada = Array.isArray(req.body) ? req.body : (Array.isArray(req.body?.eventos) ? req.body.eventos : [req.body]);
  const registrados = entrada
    .filter((e) => e && (e.accion || e.tipo))
    .map((e) => registrarEvento({
      origen: req.cliente,
      tipo: e.tipo || "api",
      usuario: e.usuario || req.cliente,
      accion: e.accion || "Evento externo",
      detalle: e.detalle || "",
      metadatos: e.metadatos || {},
      ip: req.ip,
    }));
  if (registrados.length === 0) return res.status(400).json({ message: "No se recibió ningún evento válido. Envíe { accion, tipo, usuario, detalle, metadatos }." });
  res.status(201).json({ registrados: registrados.length, eventos: registrados });
});

// Lectura de la bitácora unificada por parte de sistemas externos.
app.get("/api/integracion/bitacora", requireApiKey, (req, res) => {
  registrarEvento({ origen: req.cliente, tipo: "api", usuario: req.cliente, accion: "Lectura de bitácora", detalle: "Descarga de movimientos vía API de integración.", ip: req.ip });
  res.json(filtrarEventos(auditLog, req.query));
});

app.listen(PORT, () => console.log(`API disponible en http://localhost:${PORT}`));
