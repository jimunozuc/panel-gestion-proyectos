import { Link } from "react-router-dom";

export default function BackButton({ to = "/", label = "← Volver al menú" }) {
  return (
    <Link to={to} className="back-button">
      {label}
    </Link>
  );
}
