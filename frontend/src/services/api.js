export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
  if (!response.ok) { const error = await response.json().catch(() => ({ message: "Error desconocido" })); throw new Error(error.message || "Error en la solicitud"); }
  return response.json();
}

export const api = {
  getResumen: () => request("/resumen"),
  getEvidencias: () => request("/evidencias"),
  createEvidencia: (payload) => request("/evidencias", { method: "POST", body: JSON.stringify(payload) }),
  consultaInteligente: (pregunta) => request("/consulta-inteligente", { method: "POST", body: JSON.stringify({ pregunta }) }),
  getBitacora: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/bitacora${qs ? `?${qs}` : ""}`);
  },
  // Probador de integración: envía un evento externo autenticado con API key.
  probarIntegracion: (apiKey, evento) => request("/integracion/eventos", {
    method: "POST",
    headers: { "X-API-Key": apiKey },
    body: JSON.stringify(evento),
  }),
};
