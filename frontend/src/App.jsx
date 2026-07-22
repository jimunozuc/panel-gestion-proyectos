import { Routes, Route } from "react-router-dom";
import Iniciativas from "./pages/Iniciativas.jsx";
import EjeDetail from "./pages/EjeDetail.jsx";
import Menu from "./pages/Menu.jsx";
import Proyectos from "./pages/Proyectos.jsx";
import Personas from "./pages/Personas.jsx";
import Indicadores from "./pages/Indicadores.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Iniciativas />} />
      <Route path="/ejes/:ejeId" element={<EjeDetail />} />
      <Route path="/panel-gestion" element={<Menu />} />
      <Route path="/proyectos" element={<Proyectos />} />
      <Route path="/personas" element={<Personas />} />
      <Route path="/indicadores" element={<Indicadores />} />
    </Routes>
  );
}
