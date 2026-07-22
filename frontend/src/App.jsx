import { Routes, Route } from "react-router-dom";
import Menu from "./pages/Menu.jsx";
import Proyectos from "./pages/Proyectos.jsx";
import Personas from "./pages/Personas.jsx";
import Indicadores from "./pages/Indicadores.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Menu />} />
      <Route path="/proyectos" element={<Proyectos />} />
      <Route path="/personas" element={<Personas />} />
      <Route path="/indicadores" element={<Indicadores />} />
    </Routes>
  );
}
