import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { iniciarSeguimiento } from "./services/tracker.js";
import "./styles.css";
iniciarSeguimiento();
createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
