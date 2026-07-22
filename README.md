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

## Fase 2 (pendiente)

1. **Conectar el backend a SharePoint** vía Microsoft Graph API para leer
   `panel_iniciativas.xlsx` (sitio `uc365_SIAI`) cada ~15 minutos.
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
3. **Deploy:** frontend en GitHub Pages, backend en un servicio como Render.

## Nota sobre otro proyecto en este equipo

Existe un proyecto separado y anterior, `panel-de-iniciativas`
(`github.com/jimunozuc/panel-de-iniciativas`), que genera un dashboard de una
sola página a partir del mismo Excel usando un script Python + GitHub Actions.
Ese proyecto sigue funcionando de forma independiente y no se modifica desde
aquí.
