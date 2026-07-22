import { Routes, Route } from "react-router-dom";
import Iniciativas from "./pages/Iniciativas.jsx";
import EjeDetail from "./pages/EjeDetail.jsx";
import Menu from "./pages/Menu.jsx";
import PanelSubPage from "./pages/PanelSubPage.jsx";
import ListadoHitos from "./pages/ListadoHitos.jsx";
import AppReleases from "./pages/AppReleases.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Iniciativas />} />
      <Route path="/ejes/:ejeId" element={<EjeDetail />} />
      <Route path="/panel-gestion" element={<Menu />} />
      <Route path="/panel-gestion/listado-hitos" element={<ListadoHitos />} />
      <Route path="/panel-gestion/:slug" element={<PanelSubPage />} />
      <Route path="/app-releases" element={<AppReleases />} />
    </Routes>
  );
}
