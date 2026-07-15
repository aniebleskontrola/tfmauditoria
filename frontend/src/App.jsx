import { useState } from "react";
import Dashboard from "./pages/Dashboard.jsx";
import EvidenceForm from "./pages/EvidenceForm.jsx";
import EvidenceList from "./pages/EvidenceList.jsx";
import SmartQuery from "./pages/SmartQuery.jsx";
import AuditLog from "./pages/AuditLog.jsx";
const sections=[{"id":"dashboard","label":"Resumen"},{"id":"new","label":"Registrar evidencia"},{"id":"list","label":"Repositorio"},{"id":"query","label":"Consulta inteligente"},{"id":"audit","label":"Bitácora"}];
export default function App(){const [active,setActive]=useState("dashboard"); const [refresh,setRefresh]=useState(0); const onCreated=()=>{setRefresh(v=>v+1); setActive("list")}; return <div className="app"><aside className="sidebar"><h1>Portal de evidencias</h1><p>Prototipo TFM · Ciberseguridad</p><nav>{sections.map(s=><button key={s.id} className={active===s.id?"active":""} onClick={()=>setActive(s.id)}>{s.label}</button>)}</nav></aside><main className="content">{active==="dashboard"&&<Dashboard refresh={refresh}/>} {active==="new"&&<EvidenceForm onCreated={onCreated}/>} {active==="list"&&<EvidenceList refresh={refresh}/>} {active==="query"&&<SmartQuery/>} {active==="audit"&&<AuditLog refresh={refresh}/>}</main></div>}
