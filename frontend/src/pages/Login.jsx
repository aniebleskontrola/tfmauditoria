import { useState } from "react";
import { api, setToken } from "../services/api.js";

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError(""); setCargando(true);
    try {
      const { token, usuario: perfil } = await api.login(usuario, password);
      setToken(token);
      onLogin(perfil);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={enviar}>
        <h1>Portal de evidencias</h1>
        <p className="login-sub">Prototipo TFM · Ciberseguridad</p>
        <label>Usuario
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus autoComplete="username" placeholder="admin" />
        </label>
        <label>Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
        </label>
        <button type="submit" disabled={cargando}>{cargando ? "Verificando..." : "Iniciar sesión"}</button>
        {error && <p className="error">{error}</p>}
        <div className="login-hint">
          <strong>Credenciales de demostración</strong>
          <span>admin / Admin123* · administrador</span>
          <span>auditor / Auditor123* · auditor</span>
          <span>consultor / Consultor123* · solo lectura</span>
        </div>
      </form>
    </div>
  );
}
