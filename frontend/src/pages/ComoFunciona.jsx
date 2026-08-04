import BackButton from "../components/BackButton.jsx";

const ENTORNOS = [
  {
    tag: "Producción",
    tagClass: "hecho",
    icon: "edit",
    nombre: "App con edición",
    ruta: "/app/",
    desc: "La nueva versión: además de mirar, se puede agregar, cambiar y quitar hitos y tareas directamente ahí.",
    items: [
      "Editable — con identificación simple, sin contraseña por ahora",
      "Cada cambio queda anotado: quién, qué y cuándo",
      "Panel de Administración para roles y solicitudes",
    ],
    footer: "Para quien necesita mantener el Plan al día desde la app.",
  },
  {
    tag: "Pruebas",
    tagClass: "en-curso",
    icon: "science",
    nombre: "Sala de pruebas",
    ruta: "/dev/",
    desc: "Igual que la App con edición, pero para probar funciones nuevas antes de que lleguen a producción.",
    items: [
      "Los datos ahí pueden ser de prueba, no siempre reales",
      "Cambios de acá nunca afectan a la App con edición",
      "La usa el equipo que construye la app",
    ],
    footer: "Para probar cosas sin arriesgar nada real.",
  },
];

const COMPARACION = [
  ["Ver el avance del Plan", true, true],
  ["Agregar o quitar hitos/tareas", true, true],
  ["Historial de quién cambió qué", true, true],
  ["Roles (administrador / editor / lector)", true, true],
];

const POR_QUE = [
  {
    titulo: "Nada se rompe mientras se mejora",
    texto:
      "Las funciones nuevas se prueban en la Sala de pruebas antes de llegar a la App con edición — así lo que usa el equipo todos los días nunca recibe un cambio sin probar primero.",
  },
  {
    titulo: "Cada una tiene un dueño claro",
    texto: "La App con edición es la versión productiva. La Sala de pruebas es el paso previo antes de que algo llegue ahí.",
  },
  {
    titulo: "Migrar es progresivo, no de un día para otro",
    texto:
      "El equipo puede seguir usando la App con edición con total normalidad mientras se valida algo nuevo en la Sala de pruebas — no hace falta un cambio abrupto.",
  },
  {
    titulo: "El Excel sigue siendo la costumbre de siempre",
    texto:
      "Nadie tiene que cambiar cómo trabaja hoy: el Excel se sigue editando igual, y la app lo refleja sola. Editar directamente en la app es una opción nueva, no una obligación.",
  },
];

function FlowDiagram() {
  return (
    <svg
      viewBox="0 0 960 300"
      role="img"
      aria-label="Diagrama: el equipo edita el Excel del Plan, se sincroniza solo, y el Panel de Gestión reparte esos datos a las dos versiones: App con edición y Sala de pruebas."
      className="flow-diagram-svg"
    >
      <defs>
        <marker id="cf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#57647a" />
        </marker>
      </defs>

      <line x1="212" y1="137" x2="248" y2="137" stroke="#57647a" strokeWidth="1.6" markerEnd="url(#cf-arrow)" />
      <line x1="442" y1="137" x2="478" y2="137" stroke="#57647a" strokeWidth="1.6" markerEnd="url(#cf-arrow)" />
      <line x1="652" y1="122" x2="726" y2="90" stroke="#57647a" strokeWidth="1.6" markerEnd="url(#cf-arrow)" />
      <line x1="652" y1="152" x2="726" y2="182" stroke="#57647a" strokeWidth="1.6" markerEnd="url(#cf-arrow)" />

      <g>
        <rect x="20" y="105" width="190" height="64" rx="8" fill="#f7f9fc" stroke="#dfe5f0" />
        <text x="115" y="132" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="#12203a">Equipo UC edita</text>
        <text x="115" y="150" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="#12203a">el Excel del Plan</text>
      </g>

      <g>
        <rect x="250" y="105" width="190" height="64" rx="8" fill="#f7f9fc" stroke="#dfe5f0" />
        <text x="345" y="132" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="#12203a">Se sincroniza solo,</text>
        <text x="345" y="150" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="#12203a">sin pasos extra</text>
      </g>

      <g>
        <rect x="480" y="105" width="170" height="64" rx="10" fill="#0176DE" stroke="#0176DE" />
        <text x="565" y="142" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#fff">Panel de Gestión</text>
      </g>

      <g>
        <rect x="730" y="40" width="200" height="66" rx="8" fill="#dcfce7" stroke="#86d9ab" />
        <text x="830" y="66" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="#12203a">App con edición</text>
        <text x="830" y="84" textAnchor="middle" fontSize="12.5" fill="#166534">( /app/ )</text>
      </g>

      <g>
        <rect x="730" y="180" width="200" height="66" rx="8" fill="#fef3c7" stroke="#f0c869" />
        <text x="830" y="206" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="#12203a">Sala de pruebas</text>
        <text x="830" y="224" textAnchor="middle" fontSize="12.5" fill="#92400e">( /dev/ )</text>
      </g>
    </svg>
  );
}

export default function ComoFunciona() {
  return (
    <main className="page como-funciona-page">
      <BackButton to="/app-releases" label="← Volver a App Releases" />
      <h1>Cómo funciona el Panel de Gestión</h1>
      <p className="subtitle">
        Si nunca usaste esta app, esto explica qué son las dos versiones que vas a
        encontrar, para qué sirve cada una y por qué existen separadas en lugar de una sola.
      </p>

      <section className="cf-section">
        <h2>Las dos versiones</h2>
        <p className="cf-section-intro">
          Las dos muestran el mismo Plan Estratégico. Lo que cambia es qué tan probada
          está cada una.
        </p>
        <div className="env-cards">
          {ENTORNOS.map((e) => (
            <article key={e.nombre} className="env-card">
              <div className="env-card-head">
                <span className="material-symbols-rounded env-card-icon" aria-hidden="true">
                  {e.icon}
                </span>
                <span className={`release-status release-status--${e.tagClass}`}>{e.tag}</span>
              </div>
              <p className="env-card-name">{e.nombre}</p>
              <p className="env-card-ruta">{e.ruta}</p>
              <p className="env-card-desc">{e.desc}</p>
              <ul className="env-card-list">
                {e.items.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
              <p className="env-card-footer">{e.footer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cf-section">
        <h2>De dónde salen los datos</h2>
        <p className="cf-section-intro">
          El equipo sigue trabajando en el Excel de siempre — la app no reemplaza esa
          costumbre, la sigue de cerca automáticamente.
        </p>
        <div className="flow-diagram-wrap">
          <FlowDiagram />
        </div>
      </section>

      <section className="cf-section">
        <h2>Qué se puede hacer en cada una</h2>
        <table className="indicadores-table cf-compare-table">
          <thead>
            <tr>
              <th>&nbsp;</th>
              <th>App con edición</th>
              <th>Sala de pruebas</th>
            </tr>
          </thead>
          <tbody>
            {COMPARACION.map(([label, ...vals]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {vals.map((v, i) => (
                  <td key={i} className={v ? "cf-yes" : "cf-no"}>
                    {v ? (
                      <span className="material-symbols-rounded" aria-hidden="true">check</span>
                    ) : (
                      "—"
                    )}
                    <span className="sr-only">{v ? "Sí" : "No disponible"}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="cf-section">
        <h2>Por qué dos versiones y no una sola</h2>
        <div className="cf-why-grid">
          {POR_QUE.map((p) => (
            <div key={p.titulo} className="cf-why-item">
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
