# Portal web para la gestión de evidencias

Prototipo desarrollado como soporte práctico del Trabajo Fin de Máster **"Portal web para la gestión de evidencias"**.

El objetivo del prototipo es demostrar una herramienta web para registrar, clasificar, consultar y revisar evidencias asociadas a procesos de auditoría de ciberseguridad, incorporando una función de consulta inteligente para recuperar registros mediante lenguaje natural.

## Tecnologías utilizadas

- Frontend: React.js + Vite
- Backend: Node.js + Express
- Consulta inteligente: motor TF-IDF + similitud coseno con normalización, stopwords en español y capa de recomendación.
- Persistencia demostrativa: archivo JSON local (los registros creados se guardan en `backend/data/evidencias.json`).
- Seguridad aplicada en prototipo: Helmet, validaciones básicas y bitácora de acciones.

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
- Bitácora de auditoría.

## Nota de seguridad

No se incluyen credenciales, claves ni datos reales. Para producción deben añadirse autenticación robusta, cifrado de archivos, base de datos persistente, gestión segura de secretos y pruebas de seguridad OWASP.
