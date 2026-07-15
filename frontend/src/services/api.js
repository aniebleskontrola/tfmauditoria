export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const TOKEN_KEY = "tfm_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); };

// Permite que la app reaccione ante una sesión expirada (401).
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, { headers, ...options });
  if (response.status === 401 && path !== "/login") {
    setToken(null);
    onUnauthorized();
    throw new Error("Sesión expirada. Inicie sesión nuevamente.");
  }
  if (!response.ok) { const error = await response.json().catch(() => ({ message: "Error desconocido" })); throw new Error(error.message || "Error en la solicitud"); }
  return response.json();
}

export const api = {
  login: (usuario, password) => request("/login", { method: "POST", body: JSON.stringify({ usuario, password }) }),
  me: () => request("/me"),
  logout: () => request("/logout", { method: "POST" }).catch(() => ({ ok: true })),
  getResumen: () => request("/resumen"),
  getEvidencias: () => request("/evidencias"),
  createEvidencia: (payload) => request("/evidencias", { method: "POST", body: JSON.stringify(payload) }),
  consultaInteligente: (pregunta) => request("/consulta-inteligente", { method: "POST", body: JSON.stringify({ pregunta }) }),
  getBitacora: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/bitacora${qs ? `?${qs}` : ""}`);
  },
  probarIntegracion: (apiKey, evento) => request("/integracion/eventos", {
    method: "POST",
    headers: { "X-API-Key": apiKey },
    body: JSON.stringify(evento),
  }),
};
