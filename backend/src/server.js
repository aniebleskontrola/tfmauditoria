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

function scoreEvidence(query, evidence) {
  const q = query.toLowerCase();
  const text = [evidence.titulo, evidence.area, evidence.categoria, evidence.responsable, evidence.estado, evidence.descripcion, ...(evidence.etiquetas || [])].join(" ").toLowerCase();
  return q.split(/\s+/).filter(Boolean).reduce((score, token) => score + (text.includes(token) ? 1 : 0), 0);
}

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/evidencias", (_req, res) => res.json(readEvidences()));
app.post("/api/evidencias", (req, res) => {
  const { titulo, area, categoria, responsable, estado, fecha, descripcion, etiquetas } = req.body;
  if (!titulo || !area || !categoria || !responsable || !estado || !fecha || !descripcion) return res.status(400).json({ message: "Todos los campos principales son obligatorios." });
  const items = readEvidences();
  const newEvidence = { id: items.length ? Math.max(...items.map((e) => e.id)) + 1 : 1, titulo, area, categoria, responsable, estado, fecha, descripcion, etiquetas: String(etiquetas || "").split(",").map((t) => t.trim()).filter(Boolean) };
  items.unshift(newEvidence);
  writeEvidences(items);
  addLog("Registro de evidencia", responsable, `Se registró la evidencia: ${titulo}`);
  res.status(201).json(newEvidence);
});
app.post("/api/consulta-inteligente", (req, res) => {
  const { pregunta } = req.body;
  if (!pregunta || pregunta.trim().length < 3) return res.status(400).json({ message: "La consulta debe contener al menos 3 caracteres." });
  const ranked = readEvidences().map((e) => ({ ...e, puntuacion: scoreEvidence(pregunta, e) })).filter((e) => e.puntuacion > 0).sort((a,b)=>b.puntuacion-a.puntuacion);
  addLog("Consulta inteligente", "auditor", `Consulta realizada: ${pregunta}`);
  res.json({ pregunta, total: ranked.length, resumen: ranked.length ? `Se encontraron ${ranked.length} evidencias relacionadas.` : "No se encontraron evidencias relacionadas.", resultados: ranked });
});
app.get("/api/bitacora", (_req, res) => res.json(auditLog));
app.get("/api/resumen", (_req, res) => {
  const items=readEvidences();
  const estados=items.reduce((acc,e)=>{acc[e.estado]=(acc[e.estado]||0)+1; return acc;},{});
  res.json({ total: items.length, estados, areas: [...new Set(items.map((e)=>e.area).filter(Boolean))], categorias: [...new Set(items.map((e)=>e.categoria))] });
});
app.listen(PORT, () => console.log(`API disponible en http://localhost:${PORT}`));
