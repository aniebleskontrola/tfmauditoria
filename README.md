# Portal web para la gestión de evidencias

Prototipo desarrollado como soporte práctico del Trabajo Fin de Máster **"Portal web para la gestión de evidencias"**.

El objetivo del prototipo es demostrar una herramienta web para registrar, clasificar, consultar y revisar evidencias asociadas a procesos de auditoría de ciberseguridad, incorporando una función de consulta inteligente para recuperar registros mediante lenguaje natural.

## Tecnologías utilizadas

- Frontend: React.js + Vite
- Backend: Node.js + Express
- Persistencia demostrativa: archivo JSON local
- Seguridad aplicada en prototipo: Helmet, validaciones básicas, control lógico de roles y bitácora de acciones.

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

- Panel resumen de evidencias.
- Registro de evidencias.
- Repositorio con filtros.
- Consulta inteligente por lenguaje natural.
- Bitácora de auditoría.

## Nota de seguridad

No se incluyen credenciales, claves ni datos reales. Para producción deben añadirse autenticación robusta, cifrado de archivos, base de datos persistente, gestión segura de secretos y pruebas de seguridad OWASP.
