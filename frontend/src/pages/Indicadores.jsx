import { useEffect, useState } from "react";
import BackButton from "../components/BackButton.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function Indicadores() {
  const [indicadores, setIndicadores] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/indicadores`)
      .then((res) => res.json())
      .then(setIndicadores)
      .catch(() => setIndicadores([]));
  }, []);

  return (
    <main className="page">
      <BackButton />
      <h1>Indicadores</h1>
      <table className="indicadores-table">
        <thead>
          <tr>
            <th>KPI</th>
            <th>Descripción</th>
          </tr>
        </thead>
        <tbody>
          {indicadores.length === 0 ? (
            <tr>
              <td colSpan={2} className="empty-row">
                Aún no hay indicadores.
              </td>
            </tr>
          ) : (
            indicadores.map((row, i) => (
              <tr key={i}>
                <td>{row.kpi}</td>
                <td>{row.descripcion}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}
