import { Link } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";

const OPTIONS = [
  { to: "/proyectos", label: "Proyectos" },
  { to: "/personas", label: "Personas" },
  { to: "/indicadores", label: "Indicadores" },
];

export default function Menu() {
  return (
    <main className="page menu-page">
      <BackButton to="/ejes/inteligencia-digital" label="← Volver a Inteligencia digital" />
      <h1>Panel de Gestión</h1>
      <div className="menu-buttons">
        {OPTIONS.map((opt) => (
          <Link key={opt.to} to={opt.to} className="menu-button">
            {opt.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
