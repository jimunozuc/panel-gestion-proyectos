import { Link } from "react-router-dom";

export default function BackButton() {
  return (
    <Link to="/" className="back-button">
      ← Volver al menú
    </Link>
  );
}
