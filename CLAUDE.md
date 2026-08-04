# CLAUDE.md

Guía rápida para trabajar en este repo. Para el detalle completo (arquitectura,
origen de datos, despliegue paso a paso) ver [README.md](README.md).

## Qué es esto

Panel de seguimiento del plan estratégico de la Pontificia Universidad
Católica de Chile (Dirección de IA · VRID). Frontend React + backend Node,
desplegados por separado (GitHub Pages + Render).

## Flujo de trabajo en este repo

- Trabajar sobre la rama `develop`. Push a remoto y merge a `main` solo
  cuando el usuario lo pida explícitamente (vía PR, no push directo).
- No inventar datos de ejemplo para objetivos/iniciativas que no tengan
  información real todavía (ver más abajo).

## Estructura

```
frontend/src/
  layouts/PanelLayout.jsx   riel fijo + breadcrumb, envuelve todo con <Outlet/>
  pages/Contexto.jsx        misión + descripción de los 6 objetivos (nivel 0)
  pages/EjeDetail.jsx        iniciativas de un objetivo, tarjetas 3 columnas (nivel 1→2)
  pages/ProyectoFicha.jsx    ficha de proyecto con las 7 vistas como tabs (nivel 3)
  pages/{Kpi,CartaGantt,ListadoHitos,DistribucionResponsable,Roadmap,MapaColor,Glosario}.jsx
  pages/Perfil.jsx           resumen personal (tareas/proyectos/hitos) + agregar tarea + "ver como"
  data/plan.js               fuente de datos: objetivos, iniciativas, colores, descripciones
  data/panelPages.js         las 7 vistas del panel (slug, label, icon)
  data/releases.js           contenido de la pestaña "App Releases"
backend/src/
  server.js                  Express, expone /api/iniciativas/:num (lee solo Postgres)
  ingestaServer.js            Express aparte, expone /api/webhook/refresh (servicio Render propio)
  sesionServer.js             Express aparte, dueño de usuarios/roles (servicio Render propio,
                               puertas adentro — server.js le delega vía sesionClient.js)
  parseWorkbook.js            parsea el Excel por NOMBRE de columna, no posición
scripts/watch-and-push.mjs   watcher local (agente launchd) que empuja el Excel a los backends
```

## Navegación (importante antes de tocar rutas o layout)

Patrón riel fijo + breadcrumb. El riel (`PanelLayout.jsx`) es siempre el
mismo componente para toda la app; el contenido cambia vía rutas anidadas de
React Router:

```
/contexto                          Contexto institucional
/ejes/:ejeId                       Iniciativas del objetivo (tarjetas)
/proyectos/:proyectoId/:slug       Ficha de un proyecto (pestañas por vista)
/app-releases                      Standalone, fuera del layout del riel
```

Solo el eje **"inteligencia-digital"** tiene datos reales y está
`enabled: true` en `data/plan.js` — sus 5 iniciativas (6.1-6.5) también están
`enabled: true` porque las 5 tienen ya descripción oficial del Plan, aunque
no todas tengan proyectos reales todavía. La habilitación real vive un nivel
más abajo, en `iniciativa.proyectos[]`: cada proyecto tiene su propio
`enabled` + `sheetId` (ej. `P6.1.1`, `P6.1.2`, `P6.1.3`), y `EjeDetail.jsx`
los muestra como chips (azul = real y clickeable, gris = sin datos todavía).
No agregar `sheetId` de ejemplo a un proyecto hasta que su hoja exista de
verdad en el backend.

## Estilo (Kit Digital UC)

- Colores: `--uc-azul:#0176DE` (acciones/foco), `--uc-navy:#03122E` (riel),
  `--uc-amarillo:#FEC60D` (acento activo). El color marca jerarquía/estado,
  no decora.
- Tipografía Roboto, íconos Material Symbols Rounded (cargados vía Google
  Fonts en `index.html`), radio 4px, sombra de card
  `0 2px 8px rgba(136,136,136,.18)`.
- Anillo de foco accesible en todo elemento navegable:
  `0 0 0 3px rgba(1,118,222,.35)`. Transiciones 120–320ms,
  `cubic-bezier(0.2,0,0.2,1)`, respetando `prefers-reduced-motion`.

## Origen de datos (gotcha importante)

El backend **nunca** va a buscar el Excel por su cuenta: un script local
(`scripts/watch-and-push.mjs`) vigila la copia sincronizada por OneDrive y la
empuja por `POST /api/webhook/refresh`. `parseWorkbook.js` parsea **por
nombre de columna**, no por posición — ya se rompió una vez cuando el equipo
agregó una columna nueva (`Responsable`). Ver `## Origen de datos` en el
README para el flujo completo y cómo correrlo en local.

## Cómo correr en local

```bash
cd backend && npm install && npm run dev    # http://localhost:3001
cd frontend && npm install && npm run dev   # http://localhost:5173 (o el puerto libre siguiente)
```

Con Docker: `docker compose up --build` (ver README para variables de entorno).
