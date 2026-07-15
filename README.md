# Portal web para la gestión de evidencias

Prototipo desarrollado como soporte práctico del Trabajo Fin de Máster **"Portal web para la gestión de evidencias"**.

El objetivo del prototipo es demostrar una herramienta web para registrar, clasificar, consultar y revisar evidencias asociadas a procesos de auditoría de ciberseguridad, incorporando una función de consulta inteligente para recuperar registros mediante lenguaje natural.

## Tecnologías utilizadas

- Frontend: React.js + Vite
- Backend: Node.js + Express
- Consulta inteligente: motor TF-IDF + similitud coseno con normalización, stopwords en español y capa de recomendación.
- Persistencia demostrativa: archivos JSON locales (evidencias en `backend/data/evidencias.json` y bitácora en `backend/data/bitacora.json`).
- Integración con sistemas externos: API REST autenticada por API key y webhook de salida.
- Seguridad aplicada en prototipo: Helmet, validaciones básicas, autenticación por API key para la integración y bitácora de auditoría.

## Instalación y ejecución

### Backend

```bash
cd backend
npm install
npm run dev
```

API: `http://localhost:4000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Portal: `http://localhost:5173`

## Funcionalidades

- Panel resumen de evidencias (total, estados y áreas).
- Registro de evidencias con persistencia en JSON.
- Repositorio con filtros por área, estado y texto.
- Consulta inteligente (TF-IDF + similitud coseno) que ordena por relevancia y recomienda qué evidencia usar y qué acción tomar.
- Bitácora de auditoría unificada: registra todos los movimientos del portal (incluidos los clics y la navegación) y los de los sistemas externos conectados.
- Módulo de integraciones con un probador en vivo para simular la conexión de un sistema externo (p. ej. Kontrola).

## Integración con otros sistemas (p. ej. Kontrola)

tfmauditoria actúa como concentrador de auditoría. Otros sistemas se conectan mediante una API REST autenticada por API key y pueden enviar cada movimiento y leer la bitácora unificada. Además, cada evento se reenvía en tiempo real a un webhook configurable.

Configuración (ver `.env.example`):

- `AUDIT_API_KEYS`: claves autorizadas en formato `cliente:clave` separadas por coma.
- `KONTROLA_WEBHOOK_URL` y `KONTROLA_WEBHOOK_SECRET`: destino y firma HMAC del reenvío en tiempo real.

Endpoints de integración (requieren el encabezado `X-API-Key`):

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/integracion/estado` | Verifica la conexión y devuelve el resumen de eventos. |
| POST | `/api/integracion/eventos` | Ingesta de movimientos desde el sistema externo. |
| GET | `/api/integracion/bitacora` | Lectura de la bitácora unificada (filtros: `origen`, `tipo`, `usuario`, `desde`, `hasta`, `q`, `limit`). |

Ejemplo de envío de un movimiento:

```bash
curl -X POST http://localhost:4000/api/integracion/eventos \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-kontrola-key" \
  -d '{"tipo":"click","usuario":"jperez","accion":"Clic en Kontrola","detalle":"Abrió el módulo de auditoría"}'
```

Sin configuración previa, el prototipo habilita la clave de demostración `demo-kontrola-key`.

## Nota de seguridad

No se incluyen credenciales, claves ni datos reales. Para producción deben añadirse autenticación robusta, cifrado de archivos, base de datos persistente, gestión segura de secretos y pruebas de seguridad OWASP.
