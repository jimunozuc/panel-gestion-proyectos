import { Navigate, Route, Routes } from "react-router-dom";
import PanelLayout from "./layouts/PanelLayout.jsx";
import Contexto from "./pages/Contexto.jsx";
import Seguimiento from "./pages/Seguimiento.jsx";
import EjeDetail from "./pages/EjeDetail.jsx";
import ProyectoFicha from "./pages/ProyectoFicha.jsx";
import ListadoHitos from "./pages/ListadoHitos.jsx";
import DistribucionResponsable from "./pages/DistribucionResponsable.jsx";
import CartaGantt from "./pages/CartaGantt.jsx";
import Kpi from "./pages/Kpi.jsx";
import MapaColor from "./pages/MapaColor.jsx";
import Roadmap from "./pages/Roadmap.jsx";
import Glosario from "./pages/Glosario.jsx";
import AppReleases from "./pages/AppReleases.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<PanelLayout />}>
        <Route path="/" element={<Navigate to="/contexto" replace />} />
        <Route path="/contexto" element={<Contexto />} />
        <Route path="/seguimiento" element={<Seguimiento />} />
        <Route path="/ejes/:ejeId" element={<EjeDetail />} />
        <Route path="/proyectos/:proyectoId" element={<ProyectoFicha />}>
          <Route index element={<Navigate to="kpi" replace />} />
          <Route path="kpi" element={<Kpi />} />
          <Route path="carta-gantt" element={<CartaGantt />} />
          <Route path="mapa-color" element={<MapaColor />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="glosario" element={<Glosario />} />
          <Route path="listado-hitos" element={<ListadoHitos />} />
          <Route path="distribucion-responsable" element={<DistribucionResponsable />} />
        </Route>
      </Route>
      <Route path="/app-releases" element={<AppReleases />} />
    </Routes>
  );
}
