export const MISION_INSTITUCIONAL =
  "Contribuir a la transformación de la sociedad infundiendo nuestra identidad como sello diferenciador, en la formación, la creación, el descubrimiento, la reflexión y el servicio.";

export const OBJETIVOS = [
  {
    id: "sello",
    numero: 1,
    label: "Sello UC",
    enabled: false,
    color: "#29ABE2",
    descripcion:
      "Potenciar el sello universitario con un sentido humanista, una vocación trascendente y un compromiso activo con la búsqueda de la verdad, el bien común y la dignidad de toda persona.",
  },
  {
    id: "experiencia",
    numero: 2,
    label: "Experiencia formativa",
    enabled: false,
    color: "#F7941D",
    descripcion:
      "Potenciar una experiencia formativa rigurosa, transformadora y significativa, que se nutra del encuentro con otros.",
  },
  {
    id: "descubrimiento-y-creacion",
    numero: 3,
    label: "Descubrimiento y creación de frontera",
    enabled: false,
    color: "#39B54A",
    descripcion:
      "Impulsar el descubrimiento y la creación para que sean de frontera, significativos y oportunos.",
  },
  {
    id: "vinculacion",
    numero: 4,
    label: "Vinculación e impacto",
    enabled: false,
    color: "#8E7CC3",
    descripcion:
      "Profundizar el impacto de la formación, reflexión, creación y descubrimiento a través de su vínculo con los desafíos de la sociedad, el país y la región.",
  },
  {
    id: "robustez-y-autonomia",
    numero: 5,
    label: "Robustez y autonomía",
    enabled: false,
    color: "#00A99D",
    descripcion:
      "Lograr la robustez y autonomía del proyecto universitario para que progrese continuamente en su vigencia e impacto.",
  },
  {
    id: "inteligencia-digital",
    numero: 6,
    label: "Inteligencia digital",
    enabled: true,
    color: "#D0006F",
    descripcion:
      "Ser una universidad de vanguardia en inteligencia digital, centrada en las personas y el proyecto universitario.",
  },
];

const INICIATIVAS_POR_EJE = {
  "inteligencia-digital": [
    {
      id: "6.0",
      label: "6.0 Observación",
      enabled: false,
      descripcion:
        "Promover la observación y reflexión crítica sobre los avances en IA desde nuestro sello identitario, para guiar el avance ético y responsable de la IA, y orientar su desarrollo y uso al bien común.",
    },
    {
      id: "6.1",
      label: "6.1 Modelo formativo",
      enabled: false,
      descripcion:
        "Adaptar el modelo formativo a la presencia y uso de IA, incluyendo actualización curricular, formación docente, apoyo estudiantil, marcos éticos, y recursos pedagógicos.",
    },
    {
      id: "6.2",
      label: "6.2 Desarrollo y despliegue",
      enabled: true,
      route: "/panel-gestion",
      descripcion:
        "Desarrollar y desplegar ecosistemas digitales e IA para potenciar el descubrimiento y la creación.",
    },
    {
      id: "6.3",
      label: "6.3 Gobernanza",
      enabled: false,
      descripcion:
        "Construir una gobernanza y arquitectura institucional de datos y plataformas que garantice calidad, interoperabilidad, seguridad y uso ético de la información.",
    },
    {
      id: "6.4",
      label: "6.4 Gestión eficiente",
      enabled: false,
      descripcion:
        "Construir un ecosistema digital al servicio de una gestión organizacional eficiente, ágil y centrada en las personas.",
    },
    {
      id: "6.5",
      label: "6.5 Bienestar",
      enabled: false,
      descripcion:
        "Desarrollar herramientas digitales que fomenten el bienestar de las personas, la conexión de la comunidad y la vinculación con actores y temáticas relevantes del medio externo.",
    },
  ],
};

export function getIniciativas(ejeId) {
  return INICIATIVAS_POR_EJE[ejeId] || [];
}

// Único nodo de nivel 3 con datos reales hoy. Cuando haya más proyectos con
// ficha propia, esto debería resolverse a partir de la ruta actual en vez de
// buscar el primero con `route`.
export function findProyectoActivo() {
  for (const eje of OBJETIVOS) {
    const iniciativa = getIniciativas(eje.id).find((i) => i.route);
    if (iniciativa) return { eje, iniciativa };
  }
  return null;
}
