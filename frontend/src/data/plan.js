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
      id: "6.1",
      label: "6.1 Modelo formativo",
      enabled: true,
      descripcion:
        "Adaptar el modelo formativo a la presencia y uso de IA, incluyendo actualización curricular, formación docente, apoyo estudiantil, marcos éticos, y recursos pedagógicos.",
      proyectos: [
        {
          id: "6.1.1",
          label: "6.1.1 Nodo UC +IA",
          enabled: true,
          route: "/proyectos/6.1.1",
          sheetId: "P6.1.1",
        },
        {
          id: "6.1.2",
          label: "6.1.2 IA en el Currículo",
          enabled: true,
          route: "/proyectos/6.1.2",
          sheetId: "P6.1.2",
        },
        {
          id: "6.1.3",
          label: "6.1.3 UC Bots – Ecosistema UC de Agentes Inteligentes",
          enabled: true,
          route: "/proyectos/6.1.3",
          sheetId: "P6.1.3",
        },
      ],
    },
    {
      id: "6.2",
      label: "6.2 Desarrollo y despliegue",
      enabled: true,
      descripcion:
        "Desarrollar y desplegar ecosistemas digitales e IA para potenciar el descubrimiento y la creación.",
      proyectos: [],
    },
    {
      id: "6.3",
      label: "6.3 Gobernanza",
      enabled: true,
      descripcion:
        "Construir una gobernanza y arquitectura institucional de datos y plataformas que garantice calidad, interoperabilidad, seguridad y uso ético de la información.",
      proyectos: [
        {
          id: "6.3.1",
          label: "6.3.1 Marco Institucional de Gobernanza y Certificación",
          enabled: false,
        },
        {
          id: "6.3.2",
          label: "6.3.2 FARO UC: Federación y Acceso a Repositorios y Orígenes de Datos",
          enabled: false,
        },
        {
          id: "6.3.3",
          label: "6.3.3 SINERGIA UC",
          enabled: false,
        },
      ],
    },
    {
      id: "6.4",
      label: "6.4 Gestión eficiente",
      enabled: true,
      descripcion:
        "Construir un ecosistema digital al servicio de una gestión organizacional eficiente, ágil y centrada en las personas.",
      proyectos: [
        {
          id: "6.4.1",
          label: "6.4.1 Gestión Digital Inteligente",
          enabled: false,
        },
        {
          id: "6.4.2",
          label: "6.4.2 UC Nexo: Aceleración del Desarrollo Tecnológico",
          enabled: false,
        },
      ],
    },
    {
      id: "6.5",
      label: "6.5 Bienestar",
      enabled: true,
      descripcion:
        "Desarrollar herramientas digitales que fomenten el bienestar de las personas, la conexión de la comunidad y la vinculación con actores y temáticas relevantes del medio externo.",
      proyectos: [],
    },
  ],
};

export function getIniciativas(ejeId) {
  return INICIATIVAS_POR_EJE[ejeId] || [];
}

export function findProyecto(proyectoId) {
  for (const eje of OBJETIVOS) {
    for (const iniciativa of getIniciativas(eje.id)) {
      const proyecto = (iniciativa.proyectos || []).find((p) => p.id === proyectoId);
      if (proyecto) return { eje, iniciativa, proyecto };
    }
  }
  return null;
}
