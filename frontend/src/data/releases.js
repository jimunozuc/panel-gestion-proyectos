export const RELEASES = [
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
    status: "en-curso",
    items: [
      "Publicar el sitio",
      "Pruebas de funcionalidad para definir la estructura de navegación",
      "Pruebas de funcionamiento general",
    ],
  },
];
