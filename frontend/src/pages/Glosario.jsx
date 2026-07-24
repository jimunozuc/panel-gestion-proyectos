const KPIS = [
  {
    termino: "Avance global",
    definicion:
      "Promedio del % de avance de todas las actividades (o iniciativas sin actividades) de la iniciativa.",
  },
  {
    termino: "Iniciativas",
    definicion: "Cantidad de iniciativas (proyectos) definidas dentro de las líneas de trabajo.",
  },
  {
    termino: "Hitos",
    definicion: "Cantidad de hitos cumplidos (100% de avance) sobre el total de hitos definidos.",
  },
  {
    termino: "Completada",
    definicion: "Actividad o hito con 100% de avance.",
  },
  {
    termino: "En curso",
    definicion: "Actividad o hito con avance entre 1% y 99%.",
  },
  {
    termino: "Pendiente",
    definicion: "Actividad o hito con 0% de avance.",
  },
  {
    termino: "% avance",
    definicion:
      "Porcentaje de avance registrado por el equipo en el archivo de seguimiento para cada actividad u hito.",
  },
  {
    termino: "Avance por línea de trabajo",
    definicion:
      "Promedio de avance de las actividades agrupadas por línea (Proyectos IA, Chatbots institucionales, etc.).",
  },
  {
    termino: "Carga por responsable",
    definicion: "Cantidad de iniciativas y actividades asignadas actualmente a cada persona del equipo.",
  },
  {
    termino: "Próximos hitos",
    definicion: "Hitos cuya fecha de término aún no ha pasado, ordenados por fecha.",
  },
];

export default function Glosario() {
  return (
    <div className="vista glosario-page">
      <p className="subtitle">Explicación de los indicadores (KPI) usados en el Panel de Gestión.</p>
      <table className="indicadores-table">
        <thead>
          <tr>
            <th>Término</th>
            <th>Qué significa</th>
          </tr>
        </thead>
        <tbody>
          {KPIS.map((k) => (
            <tr key={k.termino}>
              <td>{k.termino}</td>
              <td>{k.definicion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
