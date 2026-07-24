import { Routes, Route } from "react-router-dom";
import Iniciativas from "./pages/Iniciativas.jsx";
import EjeDetail from "./pages/EjeDetail.jsx";
import Menu from "./pages/Menu.jsx";
import PanelSubPage from "./pages/PanelSubPage.jsx";
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
      <Route path="/" element={<Iniciativas />} />
      <Route path="/ejes/:ejeId" element={<EjeDetail />} />
      <Route path="/panel-gestion" element={<Menu />} />
      <Route path="/panel-gestion/kpi" element={<Kpi />} />
      <Route path="/panel-gestion/carta-gantt" element={<CartaGantt />} />
      <Route path="/panel-gestion/mapa-color" element={<MapaColor />} />
      <Route path="/panel-gestion/roadmap" element={<Roadmap />} />
      <Route path="/panel-gestion/glosario" element={<Glosario />} />
      <Route path="/panel-gestion/listado-hitos" element={<ListadoHitos />} />
      <Route path="/panel-gestion/distribucion-responsable" element={<DistribucionResponsable />} />
      <Route path="/panel-gestion/:slug" element={<PanelSubPage />} />
      <Route path="/app-releases" element={<AppReleases />} />
    </Routes>
  );
}
