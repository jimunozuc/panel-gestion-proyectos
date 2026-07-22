# Panel de Gestión de Proyectos

Aplicación web con frontend y backend separados, para la Dirección de IA ·
VRID · UC.

**Producción** (rama `main`): https://jimunozuc.github.io/panel-gestion-proyectos/
**Desarrollo** (rama `develop`): https://jimunozuc.github.io/panel-gestion-proyectos/dev/

Cada rama se despliega a su propia ruta (ver
`.github/workflows/deploy-pages.yml`), así que probar cosas en `develop` no
pisa la versión publicada en `main`.

## Navegación

```
Iniciativas (6 Ejes del Plan, solo "Inteligencia digital" habilitado)
  → Inteligencia digital (6.0-6.5, solo "6.2 Desarrollo y despliegue" habilitada)
    → Panel de Gestión (Menú: KPI | Carta Gantt | Listado de Hitos |
      Distribución por Responsable | Roadmap | Mapa de Color | Glosario)
  → App Releases (avances y versiones de la app)
```

Cada vista tiene su botón de volver al nivel anterior. Los ejes/iniciativas
deshabilitados se muestran (gris, no clickeables) para representar el Plan
completo aunque solo una parte esté activa.

## Estructura

- `frontend/` — React + Vite. Sirve las vistas y llama al backend.
  - `src/data/plan.js` — nombres y estado enabled/disabled de los Ejes e
    Iniciativas 6.x. Editar aquí para habilitar otro eje/iniciativa.
- `backend/` — Node.js + Express. Lee `panel_iniciativas.xlsx` (una hoja por
  iniciativa 6.x) y expone `GET /api/iniciativas/:num` con los datos ya
  procesados (árbol línea → iniciativa → actividad/hito, con avance calculado
  por fechas). Ver `## Origen de datos` más abajo.

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
- Panel de Gestión: 7 botones de prueba (KPI, Carta Gantt, Listado de Hitos,
  Distribución por Responsable, Roadmap, Mapa de Color, Glosario). Cada uno
  abre una página con una tabla `Nombre de la página | Descripción` — solo
  para validar que la estructura de navegación y cada botón funcionan;
  el contenido real se migra pieza por pieza (ver Versión 2.2 abajo).
- App Releases: página con los avances/versiones de la app (ver
  `frontend/src/data/releases.js` para agregar entradas nuevas).
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
| `ResumenTab` / `Resumen` | Tarjetas de KPIs / resumen general | Vista KPI |
| `GanttTab` / `Gantt` | Carta Gantt de tareas por proyecto | Vista Carta Gantt |
| `HitosTab` / `Hitos` | Listado de hitos | Vista Listado de Hitos |
| `EquipoTab` / `Equipo` | Distribución de tareas por responsable | Vista Distribución por Responsable |
| `RoadmapTab` / `Roadmap` | Roadmap trimestral | Vista Roadmap |
| `HeatmapTab` / `Heatmap` | Mapa de calor de carga de trabajo | Vista Mapa de Color |

**Fuente de datos:** ver `## Origen de datos` más abajo — el backend lee
`panel_iniciativas.xlsx` (una hoja por iniciativa 6.x) y ya no usa datos
"en duro".

### Versión 3 — Login institucional (pendiente)
Login con cuenta Microsoft/UC (Entra ID), para que solo gente de la
organización pueda ver la app. Requiere registrar una aplicación en el
Entra ID de la universidad — puede necesitar aprobación de TI. Se descartó
conectar el backend directamente a Microsoft Graph API para leer el Excel
(ver sección de abajo) porque ese registro de app resultó más complejo de
lo necesario para lo que se necesitaba lograr.

### Versiones futuras
Iteraciones adicionales por definir a medida que la app avance.

## Origen de datos

En vez de conectar el backend directamente a Microsoft Graph API (requiere
registrar una app en Entra ID de la UC, con aprobación de TI), se optó por
una vía más simple que no depende de TI:

```
Equipo edita panel_iniciativas.xlsx en SharePoint/OneDrive (como siempre)
  → Power Automate detecta el cambio ("Cuando se modifica un archivo")
  → POST a /api/webhook/refresh (con secreto compartido)
  → backend descarga el Excel (vía link "Cualquiera con el vínculo")
    y recalcula los datos en memoria
  → GET /api/iniciativas/:num sirve los datos ya frescos al frontend
```

Además del webhook, el backend reintenta la descarga cada 3 horas como
respaldo silencioso por si algún aviso de Power Automate se pierde.

**Estructura del Excel:** una hoja por iniciativa (`6.0`, `6.1`, `6.2`, ...
el número es referencial y puede cambiar). Cada hoja tiene las columnas
`Proyecto | Subproyecto | Tipo (Hito/Actividad) | Nombre | Responsable |
Fecha inicio | Fecha limite`. El backend agrupa por Proyecto → Subproyecto
→ fila, y calcula el avance (0-100%) comparando Fecha inicio/Fecha límite
contra la fecha de hoy (no hay columna de avance manual). Ver
`backend/src/parseWorkbook.js`.

Por ahora solo la hoja `6.2` (única iniciativa habilitada, ver
`frontend/src/data/plan.js`) se conecta a las vistas Listado de Hitos y
Distribución por Responsable.

**Para dejar esto funcionando en producción, faltan 4 pasos manuales**
(no se pueden automatizar desde acá):

1. **Generar el link de descarga en SharePoint**: click derecho sobre
   `panel_iniciativas.xlsx` → Compartir → cambiar a "Cualquiera con el
   vínculo" → Copiar vínculo, y agregarle `?download=1` al final para que
   descargue el archivo en vez de abrir el visor web.
2. **Desplegar el backend en Render**: este repo ya trae `render.yaml`.
   En [render.com](https://render.com) → New → Blueprint → conectar este
   repositorio de GitHub → Render detecta `render.yaml` → completar las
   variables `SHAREPOINT_XLSX_URL` (el link del paso 1) y `REFRESH_SECRET`
   (cualquier texto random que seas tú quien lo define) → Deploy.
   Una vez desplegado, copiar la URL pública que asigna Render (algo como
   `https://panel-gestion-proyectos-backend.onrender.com`).
3. **Conectar el frontend publicado a ese backend**: en GitHub →
   Settings → Secrets and variables → Actions → pestaña "Variables" →
   crear una variable llamada `VITE_API_URL` con la URL de Render del
   paso 2. El workflow de deploy (`.github/workflows/deploy-pages.yml`)
   ya está preparado para usarla.
4. **Crear el flujo en Power Automate**: en
   [make.powerautomate.com](https://make.powerautomate.com) → crear un
   flujo automatizado → disparador "Cuando se modifica un archivo"
   (SharePoint, apuntando a `panel_iniciativas.xlsx`) → acción HTTP
   (POST a `https://<url-de-render>/api/webhook/refresh`, header
   `x-refresh-secret` con el mismo valor del paso 2).

Mientras estos 4 pasos no estén hechos, el backend sigue funcionando en
local usando `backend/data/panel_iniciativas.xlsx` como respaldo (ver
`backend/.env.example`).

## Nota sobre otro proyecto en este equipo

Existe un proyecto separado y anterior, `panel-de-iniciativas`
(`github.com/jimunozuc/panel-de-iniciativas`), que genera un dashboard de una
sola página a partir del mismo Excel usando un script Python + GitHub Actions.
Ese proyecto sigue funcionando de forma independiente y no se modifica desde
aquí.
