# Panel de Gestión — Proyectos, Personas, Indicadores

Aplicación web con frontend y backend separados. Menú principal con 3 botones
(Proyectos, Personas, Indicadores), cada uno lleva a su propia vista con un
botón para volver al menú.

## Estructura

- `frontend/` — React + Vite. Sirve las vistas y llama al backend.
- `backend/` — Node.js + Express. Expone la API que en el futuro leerá datos
  reales desde el Excel de SharePoint.

## Cómo correr en local

Necesitas Node.js instalado (ver [nodejs.org](https://nodejs.org/), versión LTS).

**Backend:**

```bash
cd backend
npm install
npm run dev
```

Queda escuchando en `http://localhost:3001`.

**Frontend** (en otra terminal):

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Estado actual (Fase 1)

- Proyectos: página estática ("Proyectos" / "Estamos trabajando para Ud.").
- Personas: página con foto de marcador de posición.
- Indicadores: tabla `KPI | Descripción`, vacía — ya conectada al backend
  (`GET /api/indicadores`), pero el backend todavía devuelve `[]` porque aún
  no lee el Excel real.
- Acceso: pensado para quedar restringido a cuentas de la organización, pero
  esa parte (login) todavía no está implementada.

## Roadmap

### Versión 2.1 — Publicar en GitHub Pages
Desplegar el frontend actual (tal como está, con datos estáticos/vacíos) en
GitHub Pages para que sea accesible por URL.

### Versión 2.2 — Probar nuevas funcionalidades
Migrar, de a una pieza a la vez, funcionalidades del artefacto existente
(`panel-de-iniciativas`) hacia esta app modular. El usuario decide cuándo
empezar cada pieza (avisa con "AHORA"); nada de esto se construye por
adelantado.

**Piezas disponibles para migrar** (ya identificadas en
`panel-de-iniciativas/src/dashboard_template.html`):

| Componente original | Qué hace | Destino sugerido en la app nueva |
|---|---|---|
| `ResumenTab` | Tarjetas de KPIs / resumen general | Vista Indicadores |
| `GanttTab` | Carta Gantt de tareas por proyecto | Vista Proyectos |
| `HitosTab` | Listado de hitos | Vista Proyectos |
| `EquipoTab` | Distribución de tareas por responsable | Vista Personas |
| `RoadmapTab` | Roadmap trimestral | Vista Proyectos |
| `HeatmapTab` | Mapa de calor de carga de trabajo | Vista Personas o Indicadores |

**Fuente de datos para esta fase:** una copia fija de
`panel_iniciativas.xlsx` dentro de este repo (leída una vez al iniciar el
backend), sin sincronización automática con SharePoint todavía — eso llega
en la Versión 3.

### Versión 3 — Conectar con SharePoint
1. **Backend lee SharePoint** vía Microsoft Graph API:
   `panel_iniciativas.xlsx` (sitio `uc365_SIAI`), refrescando cada ~15 min.
   - Columnas del Excel: `Proyecto | Subproyecto | Tipo (Hito/Actividad) |
     Nombre | Responsable | Fecha inicio | Fecha límite`.
   - Personas se deriva de la columna `Responsable`.
   - Indicadores se calculan sobre los datos de proyectos (ej. cantidad de
     proyectos, hitos por estado, etc.) — la fórmula exacta de cada KPI queda
     por definir.
2. **Login institucional** con cuenta Microsoft/UC (Entra ID), para que solo
   gente de la organización pueda ver la app. Requiere registrar una
   aplicación en el Entra ID de la universidad — puede necesitar aprobación
   de TI.
3. **Backend en producción** en un servicio como Render (necesario para que
   la sincronización con SharePoint corra 24/7).

### Versiones futuras
Iteraciones adicionales por definir a medida que la app avance.

## Nota sobre otro proyecto en este equipo

Existe un proyecto separado y anterior, `panel-de-iniciativas`
(`github.com/jimunozuc/panel-de-iniciativas`), que genera un dashboard de una
sola página a partir del mismo Excel usando un script Python + GitHub Actions.
Ese proyecto sigue funcionando de forma independiente y no se modifica desde
aquí.
