import { useParams } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { PANEL_PAGES } from "../data/panelPages.js";

export default function PanelSubPage() {
  const { slug } = useParams();
  const page = PANEL_PAGES.find((p) => p.slug === slug);

  return (
    <main className="page">
      <BackButton to="/panel-gestion" label="← Volver a Panel de Gestión" />
      <h1>{page ? page.label : slug}</h1>
      <table className="indicadores-table">
        <thead>
          <tr>
            <th>Nombre de la página</th>
            <th>Descripción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{page ? page.label : slug}</td>
            <td>{page ? page.description : "—"}</td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
