# Panel de Gestión — Proyectos, Personas, Indicadores

Aplicación web con frontend y backend separados, para la Dirección de IA ·
VRID · UC.

**Publicado en:** https://jimunozuc.github.io/panel-gestion-proyectos/

## Navegación

```
Iniciativas (6 Ejes del Plan, solo "Inteligencia digital" habilitado)
  → Inteligencia digital (6.0-6.5, solo "6.2 Desarrollo y despliegue" habilitada)
    → Panel de Gestión (Menú: Proyectos | Personas | Indicadores)
```

Cada vista tiene su botón de volver al nivel anterior. Los ejes/iniciativas
deshabilitados se muestran (gris, no clickeables) para representar el Plan
completo aunque solo una parte esté activa.

## Estructura

- `frontend/` — React + Vite. Sirve las vistas y llama al backend.
  - `src/data/plan.js` — nombres y estado enabled/disabled de los Ejes e
    Iniciativas 6.x. Editar aquí para habilitar otro eje/iniciativa.
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

## Estado actual

- Navegación Iniciativas → Ejes → Panel de Gestión: **hecha**, con colores
  institucionales UC (`--uc-azul:#0176DE --uc-navy:#03122E
  --uc-amarillo:#FEC60D`).
- Proyectos: página estática ("Proyectos" / "Estamos trabajando para Ud.").
- Personas: página con foto de marcador de posición.
- Indicadores: tabla `KPI | Descripción`, vacía — ya conectada al backend
  (`GET /api/indicadores`), pero el backend todavía devuelve `[]` porque aún
  no lee el Excel real.
- Acceso: pensado para quedar restringido a cuentas de la organización, pero
  esa parte (login) todavía no está implementada.

## Roadmap

### Versión 2.1 — Publicar en GitHub Pages ✅ hecho
Deploy automático vía `.github/workflows/deploy-pages.yml` en cada push a
`main` que toque `frontend/`.

### Versión 2.2 — Probar nuevas funcionalidades (en curso)
Migrar, de a una pieza a la vez, funcionalidades de los artefactos existentes
hacia esta app modular. **El usuario decide cuándo empezar cada pieza
(avisa con "AHORA" + cuál); no se construye nada de esto por adelantado.**

Hecho hasta ahora: la capa de navegación Iniciativas/Ejes (ver arriba).

**Piezas pendientes de migrar**, identificadas en dos artefactos de
referencia:
- `/Users/usuario/Documents/panel-de-iniciativas/src/dashboard_template.html`
- `/Users/usuario/Downloads/ucbots_dashboard.html` (versión más nueva/distinta,
  de donde salieron los colores UC)

| Componente | Qué hace | Destino sugerido |
|---|---|---|
| `ResumenTab` / `Resumen` | Tarjetas de KPIs / resumen general | Vista Indicadores |
| `GanttTab` / `Gantt` | Carta Gantt de tareas por proyecto | Vista Proyectos |
| `HitosTab` / `Hitos` | Listado de hitos | Vista Proyectos |
| `EquipoTab` / `Equipo` | Distribución de tareas por responsable | Vista Personas |
| `RoadmapTab` / `Roadmap` | Roadmap trimestral | Vista Proyectos |
| `HeatmapTab` / `Heatmap` | Mapa de calor de carga de trabajo | Vista Personas o Indicadores |

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
