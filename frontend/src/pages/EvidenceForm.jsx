import { useState } from "react";
import { api } from "../services/api.js";

const AREAS = ["Seguridad", "Infraestructura", "Riesgos", "Talento humano"];
const hoy = () => new Date().toISOString().slice(0, 10);
const initialState = () => ({ titulo: "", area: "Seguridad", categoria: "", responsable: "", estado: "Pendiente", fecha: hoy(), descripcion: "", etiquetas: "" });

export default function EvidenceForm({ onCreated }) {
  const [form, setForm] = useState(initialState());
  const [message, setMessage] = useState("");

  const updateField = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    try {
      await api.createEvidencia(form);
      setForm(initialState());
      setMessage("Evidencia registrada correctamente.");
      onCreated();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section>
      <h2>Registrar evidencia</h2>
      <form className="card form" onSubmit={submit}>
        <label>Título<input name="titulo" value={form.titulo} onChange={updateField} /></label>
        <label>Área
          <select name="area" value={form.area} onChange={updateField}>
            {AREAS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <label>Categoría<input name="categoria" value={form.categoria} onChange={updateField} /></label>
        <label>Responsable<input name="responsable" value={form.responsable} onChange={updateField} /></label>
        <label>Estado
          <select name="estado" value={form.estado} onChange={updateField}>
            <option>Pendiente</option>
            <option>En revisión</option>
            <option>Aprobada</option>
            <option>Rechazada</option>
          </select>
        </label>
        <label>Fecha<input type="date" name="fecha" value={form.fecha} onChange={updateField} /></label>
        <label>Descripción<textarea name="descripcion" value={form.descripcion} onChange={updateField} /></label>
        <label>Etiquetas<input name="etiquetas" value={form.etiquetas} onChange={updateField} placeholder="backup, auditoría, accesos" /></label>
        <button type="submit">Guardar evidencia</button>
        {message && <p className="message">{message}</p>}
      </form>
    </section>
  );
}
