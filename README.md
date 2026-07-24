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

Se descartó conectar el backend directamente a Microsoft Graph API o a un
link de SharePoint: el tenant de la UC exige sesión de Microsoft incluso
para links marcados como "Cualquiera con el vínculo" (probado y confirmado
— devuelve 403). En su lugar, es **Power Automate quien empuja el archivo**
al backend, ya que corre autenticado con tu propia cuenta UC:

```
Equipo edita panel_iniciativas.xlsx en SharePoint/OneDrive (como siempre)
  → Power Automate detecta el cambio ("Cuando se modifica un archivo")
  → Power Automate obtiene el contenido del archivo (ya autenticado)
  → POST a /api/webhook/refresh con el archivo en el body (+ secreto compartido)
  → backend recalcula los datos en memoria
  → GET /api/iniciativas/:num sirve los datos ya frescos al frontend
```

El backend nunca descarga nada por su cuenta — solo recibe lo que Power
Automate le envía. Por eso conviene un segundo flujo de respaldo (recurrencia
cada varias horas) que reenvíe el archivo aunque no haya habido cambios,
por si algún aviso se pierde.

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

Mientras el backend no reciba ningún archivo (recién desplegado, antes del
primer aviso de Power Automate), sirve `backend/data/panel_iniciativas.xlsx`
como respaldo local.

### Pasos para dejar esto funcionando en producción

**1. Desplegar el backend en Render**

- Entra a [render.com](https://render.com) → "Get Started" →
  "Sign up with GitHub" (así Render se conecta directo a tu cuenta de
  GitHub, sin crear una contraseña nueva).
- En el dashboard, botón "New +" (arriba a la derecha) → "Blueprint".
- Elige el repositorio `panel-gestion-proyectos` (si no aparece en la
  lista, usa "Configure account" para darle acceso a ese repo).
- Render detecta el archivo `render.yaml` de este repo automáticamente y
  te va a pedir un valor para `REFRESH_SECRET`: inventa un texto largo y
  difícil de adivinar (como una contraseña) — **guárdalo**, lo necesitas
  en el paso 3.
- Click en "Apply"/"Create New Resources" y espera 1-2 minutos a que el
  build termine y el estado quede en "Live" (verde).
- Copia la URL pública que te asigna (algo como
  `https://panel-gestion-proyectos-backend.onrender.com`).

  *Nota:* en el plan gratuito, el backend "se duerme" tras ~15 min sin
  tráfico y tarda unos 30-60 segundos en despertar en la próxima llamada
  — normal, no es un error.

**2. Conectar el frontend publicado a ese backend**

Necesitas crear una variable en GitHub llamada `VITE_API_URL` con la URL
de Render del paso 1 (Settings → Secrets and variables → Actions →
pestaña "Variables" → "New repository variable"). Si prefieres, pásame la
URL de Render cuando la tengas y lo hago yo directamente con `gh`.

**3. Crear los flujos en Power Automate**

En [make.powerautomate.com](https://make.powerautomate.com), con tu cuenta
UC:

*Flujo 1 — Reactivo (cuando se guarda un cambio):*
1. "Crear" → "Flujo de nube automatizado" → nómbralo, por ejemplo,
   "Actualizar panel al modificar Excel".
2. Disparador: busca **"Cuando se crea o modifica un archivo (solo
   propiedades)"** (conector SharePoint). Configura: dirección del sitio
   `https://uccl0.sharepoint.com/sites/uc365_SIAI`, biblioteca "Documentos",
   carpeta `0. Prueba_gestión de proyectos`.
3. Acción nueva: **"Obtener contenido del archivo"** (SharePoint) →
   dirección del sitio igual que arriba, Id del archivo = el campo
   dinámico "Id" que entrega el disparador.
4. Acción nueva: **"HTTP"** → Método `POST`, URI
   `https://<url-de-render>/api/webhook/refresh`, Headers:
   `x-refresh-secret` = el secreto del paso 1, `Content-Type` =
   `application/octet-stream`. Body = el campo dinámico "Contenido del
   archivo" de la acción anterior.
5. Guardar.

   *Nota:* la acción "HTTP" es un conector premium en algunas licencias
   de Power Automate — si aparece bloqueada, avísame y vemos otra vía.

*Flujo 2 — Respaldo cada 6 horas (por si se pierde un aviso):*
Igual al Flujo 1, pero el disparador es **"Recurrencia"** (intervalo 6,
frecuencia horas) en vez de "Cuando se modifica un archivo" — y en
"Obtener contenido del archivo" apuntas directo al archivo (sin Id
dinámico, ya que no hay disparador de por medio).

## Nota sobre otro proyecto en este equipo

Existe un proyecto separado y anterior, `panel-de-iniciativas`
(`github.com/jimunozuc/panel-de-iniciativas`), que genera un dashboard de una
sola página a partir del mismo Excel usando un script Python + GitHub Actions.
Ese proyecto sigue funcionando de forma independiente y no se modifica desde
aquí.
