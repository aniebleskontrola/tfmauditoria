import { API_URL } from "./api.js";

// Cola de eventos capturados en el portal. Se envían por lotes para no saturar la red.
let cola = [];
let timer = null;

function resumenElemento(el) {
  if (!el || !el.tagName) return {};
  const texto = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);
  return {
    etiqueta: el.tagName.toLowerCase(),
    id: el.id || undefined,
    clase: typeof el.className === "string" && el.className ? el.className : undefined,
    texto: texto || undefined,
  };
}

export function trackEvento(evento) {
  cola.push(evento);
  if (!timer) timer = setTimeout(() => flush(false), 1500);
}

export function flush(usarBeacon = false) {
  if (timer) { clearTimeout(timer); timer = null; }
  if (cola.length === 0) return;
  const lote = cola.splice(0, cola.length);
  const body = JSON.stringify({ eventos: lote });
  const url = `${API_URL}/eventos`;
  if (usarBeacon && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    return;
  }
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}

// Registra un evento de navegación entre módulos del portal.
export function trackNavegacion(seccion, etiqueta) {
  trackEvento({ tipo: "navegacion", accion: "Navegación", detalle: `Ingresó al módulo: ${etiqueta}`, metadatos: { seccion } });
}

// Captura TODOS los clics del usuario en la plataforma.
export function iniciarSeguimiento() {
  if (window.__trackerActivo) return;
  window.__trackerActivo = true;

  document.addEventListener("click", (e) => {
    const objetivo = e.target.closest("button, a, input, select, textarea, [role], li, .card, .metric") || e.target;
    const meta = resumenElemento(objetivo);
    trackEvento({
      tipo: "click",
      accion: "Clic en interfaz",
      detalle: meta.texto ? `Clic en "${meta.texto}"` : `Clic en <${meta.etiqueta || "elemento"}>`,
      metadatos: { ...meta, seccion: document.body.dataset.seccion || "desconocida", x: e.clientX, y: e.clientY },
    });
  }, true);

  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(true); });
  window.addEventListener("beforeunload", () => flush(true));
}
