export const RELEASES = [
  {
    version: "MVP 3.0",
    status: "hecho",
    items: [
      "Ahora se puede editar el panel directamente desde la aplicación — agregar, modificar y quitar hitos y tareas — sin depender de que alguien actualice el Excel. Cada cambio queda registrado en una bitácora con quién lo hizo y cuándo.",
      "Nueva pantalla de Administración: usuarios y sus roles, bitácora completa de cambios, y un formulario para solicitar que se agregue un proyecto nuevo al Plan.",
      "La aplicación con edición se publicó como entorno productivo propio (/app/), separado del panel de solo consulta que el equipo usa hoy — para poder mejorarla sin arriesgar la versión estable.",
    ],
  },
  {
    version: "MVP 2.0",
    status: "hecho",
    items: [
      "Cada iniciativa con proyectos reales conectados muestra su % de avance y sus hitos cumplidos junto al nombre, por ejemplo \"6.1 Modelo formativo 34% · 4/21 hitos\".",
      "Nueva vista Seguimiento (botón bajo Contexto): consolida el avance, los hitos y la carga de trabajo de todos los proyectos reales del Plan en un solo lugar, pensada para el equipo que da seguimiento al plan estratégico completo.",
    ],
  },
  {
    version: "MVP 1.3",
    status: "hecho",
    items: [
      "Las 5 iniciativas de Inteligencia digital (6.1 a 6.5) ya tienen su descripción oficial del Plan.",
      "6.1 Modelo formativo muestra sus 3 proyectos reales — Nodo UC +IA, IA en el Currículo y UC Bots — cada uno con su propia ficha de 7 vistas.",
      "6.3 Gobernanza y 6.4 Gestión eficiente ya listan sus proyectos oficiales, aunque todavía sin información cargada (se ven atenuados hasta que haya datos reales).",
    ],
  },
  {
    version: "MVP 1.2",
    status: "hecho",
    items: [
      "Nueva navegación de riel fijo + breadcrumb: los 6 objetivos estratégicos del Plan quedan siempre visibles a la izquierda, sin tener que retroceder para saltar de uno a otro.",
      "Nueva pestaña de Contexto institucional, con el logo UC, la misión y la descripción real de los 6 objetivos y de las 6 iniciativas de Inteligencia digital.",
      "La ficha de cada proyecto muestra sus 7 vistas como pestañas horizontales en vez de un menú aparte.",
      "Las iniciativas de un objetivo se ven como tarjetas de 3 columnas, cada una con su propio botón de acción.",
    ],
  },
  {
    version: "MVP 1.1",
    status: "hecho",
    items: [
      "Las vistas del Panel de Gestión (Listado de Hitos, Distribución por Responsable, Carta Gantt, KPI, Mapa de Color y Roadmap) ya muestran la información real del proyecto, no datos de ejemplo.",
      "El panel se actualiza solo cuando el equipo edita el archivo de seguimiento del proyecto — ya no hace falta cargar datos a mano.",
      "Se activó el servidor propio (backend) que procesa y entrega los datos a la aplicación.",
      "Se corrigieron errores de datos detectados durante las pruebas (fechas y responsables que se mostraban mal tras cambios en el archivo de seguimiento).",
      "Se dejó lista la opción de instalar la aplicación con Docker, pensando en facilitar el trabajo en equipo más adelante.",
    ],
  },
  {
    version: "MVP 1.0",
    status: "hecho",
    items: [
      "Publicar el sitio",
      "Pruebas de funcionalidad para definir la estructura de navegación",
      "Pruebas de funcionamiento general",
    ],
  },
];
