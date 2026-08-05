# Plan de pruebas — Estabilidad, Seguridad, Escalabilidad y Calidad

**Proyecto:** Panel de Gestión de Proyectos (Dirección de IA · VRID UC)
**Alcance revisado:** backend (4 servicios: `server.js`, `ingestaServer.js`, `sesionServer.js`, `adminServer.js`), frontend (React/Vite), infraestructura (Render, GitHub Pages, Docker, CI)
**Base:** rama `develop`, commit `b0eae56`
**Método:** lectura directa del código fuente (no checklist genérico). Los hallazgos marcados como P0 fueron releídos y confirmados línea por línea antes de incluirse acá.

---

## 1. Resumen ejecutivo

40 hallazgos concretos, agrupados por severidad. El sistema tiene bases sólidas (ver
[§2](#2-lo-que-ya-está-bien-resuelto)) — esto no es una lista de "todo está mal", es
dónde enfocar las próximas rondas de trabajo.

> **Actualización 2026-08-04:** los 5 P0 quedaron corregidos. SEG-02, SEG-03, EST-01 y
> EST-02 son fixes definitivos. SEG-01 se resolvió con una **contraseña interina**
> (`password_hash` en `users`, `passwordHash.js` con scrypt, freno de fuerza bruta en
> `sesionServer.js` — ver README, Versión 3.0.1) — no es la solución final, sigue
> pendiente integrar CAS/SSO institucional (Versión 3.1). Detalle en cada sección.

**Estado de verificación automatizada (2026-08-04):** el entorno donde se hicieron
estos fixes no tiene Docker ni Postgres disponible, así que solo se pudo correr
12 de los 82 tests del backend (los que no tocan base de datos: `passwordHash.test.js`,
`prodSecretGuard.test.js`, `db/pool.test.js` — los 3 nuevos de esta ronda, todos ✅
pasando). Los otros 70 (incluidos los 15 tests nuevos agregados a
`sesionServer.test.js` para SEG-01/must_change_password) están escritos y
revisados pero **sin correr** — ver `## 10. Cómo correr los tests con Docker` para
el procedimiento. Frontend: build limpio, login modal verificado a mano en
navegador; el modal de cambio forzado de contraseña no se pudo disparar en vivo
(no hay backend con Postgres real acá) pero pasó revisión de código + build.

**Aviso operativo antes de desplegar a Render:** SEG-02/SEG-03 ahora hacen que
`server.js`/`ingestaServer.js`/`sesionServer.js`/`adminServer.js` **rechacen arrancar**
en producción si falta `COOKIE_SECRET`/`REFRESH_SECRET`/`SESION_SECRET`/`ADMIN_SECRET`
respectivamente. Confirmar que los 4 están seteados en el dashboard de Render de cada
servicio (`/app/` y `/dev/`) **antes** de mergear esto a `main` — si alguno falta hoy,
ese servicio quedaría caído tras el deploy en vez de seguir sirviendo sin protección.
Además, migración `005_users_password.sql` deja a **todas las cuentas existentes sin
poder loguearse** hasta que un administrador les asigne contraseña desde `/admin`
(columna "Contraseña" → "Restablecer") — avisar a los usuarios reales antes de mergear.

| Prioridad | Cantidad | Qué significa |
|---|---|---|
| 🔴 P0 — Crítico | 5 | Explotable hoy con esfuerzo mínimo, o puede tumbar el sistema completo. Atender antes de sumar features nuevas. |
| 🟠 P1 — Alto | 9 | Riesgo real, impacto acotado o requiere condiciones específicas. Próximas 2-4 semanas. |
| 🟡 P2 — Medio | 15 | Mejora de robustez/calidad, no urgente. Backlog priorizado. |
| ⚪ P3 — Bajo | 11 | Deuda técnica menor o mejora incremental. Backlog. |

| ID | Dimensión | Hallazgo | Prioridad |
|---|---|---|---|
| SEG-01 | Seguridad | Login solo con correo, sin verificar que quien lo escribe es su dueño | 🔴 P0 |
| SEG-02 | Seguridad | Cookie de sesión firmada con secreto hardcodeado si falta `COOKIE_SECRET` | 🔴 P0 |
| SEG-03 | Seguridad | `/internal/*` y el webhook de ingesta quedan sin protección si falta su secreto | 🔴 P0 |
| EST-01 | Estabilidad | Pool de Postgres sin manejo de error tumba el proceso completo (los 4 servicios) | 🔴 P0 |
| EST-02 | Estabilidad | Verificación de sesión sin timeout puede colgar TODO el panel indefinidamente | 🔴 P0 |
| SEG-04 | Seguridad | TLS sin verificar certificado en la conexión a Postgres en producción | 🟠 P1 |
| SEG-05 | Seguridad | Comparación de secretos no timing-safe | 🟠 P1 |
| SEG-06 | Seguridad | `SameSite=None` en producción sin token CSRF | 🟠 P1 |
| SEG-07 | Seguridad | Excel de ingesta sin validar tipo de archivo ni protección de zip bomb | 🟠 P1 |
| EST-03 / ESC-01 | Estabilidad + Escalabilidad | Llamadas internas `server.js → sesión/admin` sin timeout | 🟠 P1 |
| EST-04 | Estabilidad | El fallback "modo solo lectura desde Excel" sirve una muestra vieja, nunca la real | 🟠 P1 |
| EST-05 / ESC-02 | Estabilidad + Escalabilidad | 4 pools sin límite, hasta ~60-80 conexiones potenciales contra 1 Postgres free | 🟠 P1 |
| EST-06 | Estabilidad | La ingesta no valida que el Excel tenga las hojas esperadas | 🟠 P1 |
| CAL-01 | Calidad | Frontend sin testing/linting/formato configurado, en absoluto | 🟠 P1 |
| CAL-02 | Calidad | Frontend con 0% de cobertura de tests (30 archivos, 0 tests) | 🟠 P1 |
| SEG-08 · SEG-09 · EST-07..12 · ESC-03..06 · CAL-03..07 | — | Ver detalle por sección | 🟡 P2 |
| SEG-10..13 · EST-13 · ESC-07..09 · CAL-08..09 | — | Ver detalle por sección | ⚪ P3 |

---

## 2. Lo que ya está bien resuelto

Para que el plan no se lea como "reescribir todo": esto ya está bien y no hace falta
tocarlo, solo protegerlo con regresión cuando se toque código cerca.

- **SQL parametrizado sin excepciones** en las 4 servicios y todas las rutas — cero
  concatenación de datos de entrada en queries.
- **Autorización consistente**: `requireAdmin`/`requireEditor`/`requireUser` cubren
  todas las rutas sensibles, sin huecos encontrados.
- **Cookies con `httpOnly`+`secure` en producción**, y la firma usa comparación segura
  (vía `cookie-signature`, no código propio).
- **"Ver como" bien acotado**: valida el rol real (no el simulado) en cada request y
  queda auditado.
- **Baja suave de usuarios** (`activo=false`) en vez de `DELETE` físico.
- **Try/catch consistente** en absolutamente todos los route handlers async revisados,
  en los 4 servicios.
- **Ningún endpoint expone stack traces.**
- **Los 4 servicios tienen health check**, con transacciones bien usadas
  (`BEGIN`/`COMMIT`/`ROLLBACK` + `client.release()` en `finally`) en las escrituras
  multi-paso.
- **El patrón "una falla parcial no tapa las demás"** (el fix de `Admin.jsx`) es un
  idiom replicado, no un parche aislado — las páginas que combinan varias fuentes lo
  usan consistentemente.
- **Excel parseado por nombre de columna**, con test de regresión explícito para el
  bug histórico que documenta `CLAUDE.md`.
- **Aislamiento por `DB_SCHEMA`** entre entornos (`/app/`, `/dev/`) en la misma
  instancia Postgres — permite escalar horizontalmente `server.js` sin sticky
  sessions el día que el plan de Render lo permita.
- **Row-level locking** (`SELECT ... FOR UPDATE`) en ediciones concurrentes de nodos.
- **Backend con cobertura de tests real y bien dirigida** a casos de error/borde
  (401/403/400/409), contra Postgres real (no mockeado), con CI que la corre en cada
  PR/push.
- **README y CLAUDE.md al día** respecto a la arquitectura real de 4 servicios,
  incluso con el corte de `adminServer.js` de hoy mismo.
- **Cero antipatrón grave de accesibilidad**: no hay un solo `<div onClick>` sin rol
  ni manejo de teclado; todo lo clickeable usa `<button>` nativo.

---

## 3. Seguridad

### 🔴 SEG-01 — Login sin verificar que quien escribe el correo es su dueño

**Estado: ✅ mitigado (interino) 2026-08-04.** Se agregó contraseña —
`password_hash` en `users` (migración `005_users_password.sql`), hash con
`scrypt` (`backend/src/passwordHash.js`, sin dependencia nueva), verificación
timing-safe, y freno de fuerza bruta en memoria (5 intentos → bloqueo de 15
min por correo) en `sesionServer.js`. Un administrador la asigna al dar de
alta o restablecer una cuenta desde `/admin`, lo que marca
`must_change_password` (migración `006_users_must_change_password.sql`) —
la persona ve un modal de cambio obligatorio en su próximo login
(`POST /internal/change-password`, sin esto no puede seguir usando el
panel). `backend/set-initial-passwords.mjs` asigna la misma contraseña
temporal a todas las cuentas que quedaron sin una tras la migración, de una
sola vez. **No es la solución final**: sigue sin haber CAS/SSO institucional
(eso es la Versión 3.1, todavía pendiente) — esto reduce la superficie de
ataque de "cualquiera que conozca el correo entra" a "fuerza bruta acotada
contra una contraseña real, de un solo uso hasta que cada quien fija la
suya", que es lo que el propio usuario del proyecto pidió como paso
intermedio.

**Objetivo:** confirmar que hoy nada impide autenticarse como cualquier cuenta ya
aprovisionada con solo conocer/adivinar su correo institucional.

**Pasos:**
```bash
curl -X POST http://localhost:3003/internal/login \
  -H "Content-Type: application/json" \
  -H "x-sesion-secret: $SESION_SECRET" \
  -d '{"correo":"correo-de-un-administrador-real@uc.cl"}'
```

**Resultado hoy:** `200 OK` con los datos completos de esa cuenta (id, rol
`administrador` incluido) — sin password, OTP, magic link ni SSO. El propio comentario
de la migración que habilitó login-por-correo ya lo admite: es "la clave estable que
en el futuro validará CAS/SSO" — hoy no lo valida.

**Resultado esperado:** el login debe exigir una prueba real de posesión del correo
(integración con CAS/SSO institucional, o al menos un magic link/código enviado al
correo real) antes de emitir la cookie de sesión.

**Referencia:** `backend/src/sesionServer.js:154-207`

---

### 🔴 SEG-02 — Cookie de sesión firmada con secreto hardcodeado si falta `COOKIE_SECRET`

**Estado: ✅ corregido 2026-08-04.** `server.js` rechaza arrancar
(`process.exit(1)`) en producción si `COOKIE_SECRET` no está definida —
verificado con un test de caja negra que arranca el proceso real
(`prodSecretGuard.test.js`). El fallback hardcodeado sigue en el código
para desarrollo local, pero ya no es alcanzable en producción.

**Objetivo:** confirmar que el sistema no debe arrancar en producción con un secreto
de firma público y conocido.

**Pasos:**
1. Confirmar en `backend/src/server.js:27`:
   ```js
   app.use(cookieParser(process.env.COOKIE_SECRET || "dev-secret-cambiar-en-produccion"));
   ```
2. Arrancar `server.js` con `NODE_ENV=production` y sin definir `COOKIE_SECRET`.
3. Con el string público de arriba, firmar a mano una cookie `uid=<id-de-otra-cuenta>`
   con el algoritmo de `cookie-signature` y enviarla al backend.

**Resultado hoy:** el proceso arranca sin ningún error ni advertencia, y firmaría con
ese string público — cualquiera que lea el repo (es público en GitHub) podría forjar
una cookie válida para suplantar a cualquier usuario por id.

**Resultado esperado:** el proceso debe **rechazar arrancar** en producción si
`COOKIE_SECRET` no está definido, en vez de caer a un valor por defecto conocido.

**Referencia:** `backend/src/server.js:27`, `docker-compose.yml:21`

---

### 🔴 SEG-03 — `/internal/*` y el webhook de ingesta sin protección si falta su secreto

**Estado: ✅ corregido 2026-08-04.** Los 3 servicios (`ingestaServer.js`,
`sesionServer.js`, `adminServer.js`) ahora rechazan arrancar en producción
si falta su secreto respectivo — mismo mecanismo que SEG-02, verificado con
`prodSecretGuard.test.js` (spawns reales de cada proceso). Pendiente
operativo: confirmar en Render que los 3 secretos están seteados antes de
desplegar (ver aviso al inicio del documento).

**Objetivo:** confirmar que los 3 secretos internos (`SESION_SECRET`, `ADMIN_SECRET`,
`REFRESH_SECRET`) fallan **abiertos**, no cerrados, cuando la env var no está seteada.

**Pasos:**
```bash
# Sin SESION_SECRET definida en el entorno de sesionServer.js:
curl http://localhost:3003/internal/admin/users
```

**Resultado hoy:** el mismo patrón exacto en los tres servicios —
`if (expected && provided !== expected)` — cuando `expected` es `undefined`/vacío, la
condición es `false` y el middleware llama `next()` sin más. `GET
/internal/admin/users` devuelve correo/nombre/rol/última conexión de **todos** los
usuarios; `POST`/`PATCH` permiten crear o ascender cuentas a administrador; el webhook
de ingesta acepta un Excel de cualquiera y reemplaza todo el dataset. Ninguno de los 4
`start()` valida al arrancar que su secreto esté seteado, y no hay ningún test que
cubra el caso "secreto vacío" (solo "secreto seteado y header no coincide").
Agravante: `render.yaml` solo declara el secreto del servicio principal — los otros
tres se configuran a mano en el dashboard de Render, sin nada versionado que impida
dejarlos en blanco.

**Resultado esperado:** cada servicio debe rechazar arrancar (fail **closed**) si su
secreto no está definido, y el plan de pruebas de release debe incluir un test que
verifique explícitamente "secreto vacío ⇒ servicio no arranca / endpoint rechaza".

**Referencia:** `ingestaServer.js:20-25`, `sesionServer.js:16-24`, `adminServer.js:16-24`

---

### 🟠 Hallazgos altos (P1)

| ID | Hallazgo | Detalle | Referencia |
|---|---|---|---|
| SEG-04 | TLS sin verificar certificado hacia Postgres en producción | `ssl: { rejectUnauthorized: false }` desactiva la validación completa del certificado, no solo el hostname — abre la puerta a MITM si la ruta de red no es 100% privada | `db/pool.js:15` |
| SEG-05 | Comparación de secretos no timing-safe | Los 3 middlewares usan `!==` plano en vez de `crypto.timingSafeEqual`. Impacto bajo en HTTP normal, pero fácil de cerrar | `ingestaServer.js:22`, `sesionServer.js:19`, `adminServer.js:19` |
| SEG-06 | `SameSite=None` en producción sin token CSRF | Necesario para cookie cross-domain (GitHub Pages ↔ Render), pero elimina la defensa SameSite. Hoy acotado porque las rutas que mutan datos exigen `Content-Type: application/json` (fuerza preflight) — pero `POST /api/session/logout` y `.../ver-como/salir` no requieren body y sí son alcanzables con un `<form>` cross-site simple | `session.js:14`, `routes/session.js:30-34,62-65` |
| SEG-07 | Excel de ingesta sin validar tipo de archivo ni protección de zip bomb | Solo se valida "es un Buffer no vacío" antes de descomprimir con ExcelJS sin límite ni timeout de parseo. El límite de 10MB en la subida no limita el tamaño ya descomprimido en memoria | `ingestaServer.js:26-29`, `parseWorkbook.js:230-231` |
| SEG-08 (=EST-03/ESC-01) | Clientes internos sin timeout | Ver detalle en [§4](#-est-03--esc-01--llamadas-internas-sin-timeout) | `sesionClient.js:9-26`, `adminClient.js:8-25` |

### 🟡 / ⚪ Hallazgos medios y bajos

| ID | Prioridad | Hallazgo | Referencia |
|---|---|---|---|
| SEG-09 | 🟡 P2 | `avance` sin validar rango 0-100 (integridad de datos, no seguridad real) | `routes/nodos.js:8,94-112`, `migrations/001_init.sql:25` |
| SEG-10 | 🟡 P2 | Mensajes de error crudos (`err.message`) devueltos al cliente en varios catch — fuga menor de detalles internos | `server.js:63`, `adminServer.js:49`, `ingestaServer.js:35`, `routes/nodos.js:73,141,176` |
| SEG-11 | ⚪ P3 | Sin HSTS ni redirect propio a HTTPS — 100% delegado a Render/GitHub Pages | — |
| SEG-12 | ⚪ P3 | `DB_SCHEMA` interpolado sin escapar en el connection string — hoy inofensivo (viene de env var de despliegue, no de HTTP) pero es un patrón frágil | `db/pool.js:16` |
| SEG-13 | ⚪ P3 | Sin rotación de `COOKIE_SECRET` (cookie-parser soporta array de secretos, no se usa) | `server.js:27` |

---

## 4. Estabilidad

### 🔴 EST-01 — Pool de Postgres sin manejo de error tumba el proceso completo

**Estado: ✅ corregido 2026-08-04.** `db/pool.js` ahora registra
`pool.on('error', ...)`, que loguea y no tumba el proceso. Verificado
emitiendo el evento directamente sobre el pool real (`db/pool.test.js`) —
sin el listener, `EventEmitter` lanzaría sincrónicamente y el test fallaría.

**Objetivo:** confirmar que un error de conexión inactiva en el pool no debe tumbar
el proceso Node.

**Pasos:**
1. Levantar cualquiera de los 4 servicios contra Postgres local.
2. Dejar una conexión del pool inactiva (sin tráfico) y forzar un corte de red hacia
   Postgres (`docker stop` del contenedor, o un proxy que resetee la conexión)
   mientras el proceso Node sigue arriba.
3. Reintentar una petición normal.

**Resultado hoy:** no existe `pool.on('error', ...)` en `db/pool.js`, y tampoco
`process.on('uncaughtException')`/`('unhandledRejection')` en ninguno de los 4
entrypoints (confirmado por grep). Cuando `pg-pool` emite `'error'` en un cliente
inactivo sin listener registrado, Node lanza una excepción no capturada que tumba el
proceso completo — **cualquiera** de los 4 servicios, porque todos importan el mismo
`db/pool.js`. Render lo reinicia, perdiendo requests en vuelo.

**Resultado esperado:** el proceso debe seguir vivo, registrar el error y
reconectar/responder 503 a lo que dependa de esa conexión.

**Referencia:** `db/pool.js:13-17`

---

### 🔴 EST-02 — Verificación de sesión sin timeout puede colgar TODO el panel

**Estado: ✅ corregido 2026-08-04.** `db/pool.js` ahora fija
`connectionTimeoutMillis`, `statement_timeout` y `query_timeout` en 5s cada
uno. Una consulta colgada (Postgres lento/inalcanzable) ahora falla con un
error a los 5s como máximo, que cae en el `catch` ya existente de
`attachUser` (`req.user = null`) en vez de esperar para siempre. Verificado
que las 3 opciones quedan configuradas en el pool real
(`db/pool.test.js`) — no se simuló el cuelgue de red en sí (requeriría
infraestructura de test más pesada), así que esto verifica la
configuración, no el comportamiento bajo un cuelgue real.

**Objetivo:** confirmar que una demora en Postgres no debe congelar la aplicación
completa detrás de la pantalla de carga.

**Pasos:**
1. Con una cookie de sesión válida ya emitida (dura hasta 180 días).
2. Simular una conexión a Postgres que se **cuelga** en vez de fallar rápido (`tc`/
   `iptables` dropeando paquetes, o `SIGSTOP` al proceso de Postgres) — distinto de
   "Postgres caído", que sí está bien manejado.
3. Recargar el panel en el navegador con la cookie ya puesta.

**Resultado hoy:** `attachUser` hace `await pool.query(...)` sin timeout
(`connectionTimeoutMillis` no está configurado en el pool, default de `pg` = sin
límite). `/api/session` nunca responde. `PanelLayout.jsx` envuelve **todo** el
contenido (`<Outlet/>`) detrás de `sessionLoading`, que solo pasa a `false` cuando esa
promesa resuelve. El resultado: la pantalla de "Cargando…" queda así para siempre, en
todas las páginas — y esto ocurre un nivel por encima de donde se aplicó el fix de
`Admin.jsx`, así que ese fix no lo cubre. De paso, esto anula el fallback "modo solo
lectura desde Excel" (EST-04): nunca se llega a pedir datos porque la verificación de
sesión bloquea antes.

**Resultado esperado:** la verificación de sesión debe tener un timeout razonable
(3-5s) y degradar con un error explícito en vez de colgarse indefinidamente.

**Referencia:** `session.js:63-90` (`attachUser`), `db/pool.js` (sin
`connectionTimeoutMillis`), `frontend/src/layouts/PanelLayout.jsx:147-161`,
`frontend/src/utils/SessionContext.jsx:12-20`

---

### 🟠 EST-03 / ESC-01 — Llamadas internas sin timeout

**Objetivo:** confirmar qué le llega al usuario si `sesionServer.js`/`adminServer.js`
están lentos (no caídos) — en particular por un cold start del plan free de Render.

**Pasos:**
1. Simular latencia alta (no caída) en `sesionServer.js` — ej. un proxy que demore
   la respuesta 60s+.
2. Intentar iniciar sesión desde el frontend.

**Resultado hoy:** `sesionClient.js` y `adminClient.js` usan `fetch()` plano, sin
`AbortController`/timeout (confirmado por grep en todo el repo). El caso "servicio
responde error o rechaza conexión" **sí** está bien manejado (`503` controlado, sin
stack trace) — el problema es el caso lento/colgado: el límite real es el timeout
default de `fetch` en Node (~300s), no una decisión consciente. Del lado del
navegador, `apiFetch` tampoco tiene timeout, así que un login colgado se ve como un
botón "Entrando..." que no termina nunca, sin mensaje ni reintento. Esto es
especialmente relevante porque `sesionServer.js`/`adminServer.js`/`ingestaServer.js`
corren en el plan free de Render (se duermen tras inactividad, tardan decenas de
segundos en despertar) — el primer login del día, tras una noche sin uso, dispara
esta cadena.

**Resultado esperado:** timeout explícito (`AbortController`, 5-10s) en
`sesionClient.js`/`adminClient.js` y en `apiFetch` del frontend, con mensaje claro
("el servicio está iniciando, reintenta en unos segundos") en vez de una espera
indefinida.

**Referencia:** `sesionClient.js:9-26`, `adminClient.js:8-25`,
`frontend/src/utils/api.js:3-11`

---

### 🟠 Otros hallazgos altos (P1)

| ID | Hallazgo | Detalle | Referencia |
|---|---|---|---|
| EST-04 | El fallback "solo lectura desde Excel" sirve una muestra vieja, nunca la real | `ingestaServer.js` y `server.js` son procesos separados: el caché en memoria que actualiza el webhook vive solo en el proceso de `ingestaServer.js`. El fallback de `server.js` cuando Postgres falla lee `backend/data/panel_iniciativas.xlsx` — la muestra embebida en el repo, no el Excel real de OneDrive — y de ahí en más sirve siempre esa copia cacheada | `dataSource.js:7,17-31`, `server.js:52-64` |
| EST-05 / ESC-02 | 4 pools sin `max`/`connectionTimeoutMillis`, contra 1 Postgres compartida entre `/app/` y `/dev/` | Sin `max` explícito, cada uno de los 4 procesos abre su propio pool (default `pg`=10). Con los 3 servicios ya desplegados por entorno, son hasta 60 conexiones potenciales; con el 4º (`adminServer.js`) en ambos entornos, sube a 80 — contra una sola instancia Postgres free. Vale confirmar el límite real del plan contratado antes de sumar el servicio de admin en Render | `db/pool.js:13-17` |
| EST-06 | La ingesta no valida que el Excel tenga las hojas esperadas | Un `.xlsx` válido pero vacío o sin las hojas `P6.1.1`/`P6.1.2`/`P6.1.3` devuelve `{}` sin error — el webhook responde `200 {status:"ok"}` y el watcher lo registra como éxito, sin haber importado nada real. Sin cobertura de test (los 6 tests de `parseWorkbook.test.js` son todos de camino feliz) | `parseWorkbook.js:229-246`, `ingestaServer.js:30-36` |

### 🟡 / ⚪ Hallazgos medios y bajos

| ID | Prioridad | Hallazgo | Referencia |
|---|---|---|---|
| EST-07 | 🟡 P2 | Filas con tipo de dato inesperado en la hoja Gantt (ej. texto en la columna Nivel) se descartan en silencio, sin log ni contador | `parseWorkbook.js:188,191` |
| EST-08 | 🟡 P2 | Sin `HEALTHCHECK` en `backend/Dockerfile` — el endpoint `/api/health` existe pero no se usa desde el contenedor | `backend/Dockerfile:1-13` |
| EST-09 | 🟡 P2 | Logging solo `console.*`, sin niveles ni agregación — hoy, enterarse de una falla requiere entrar a Render a mano, servicio por servicio | — |
| EST-10 | 🟡 P2 | Sin middleware de error propio en los 4 apps — un JSON malformado o payload que excede el límite cae en el formato de error default de Express en vez del `{error:"..."}` consistente del resto de la API | — |
| EST-11 | ⚪ P3 | Migraciones sin `IF NOT EXISTS` — riesgo de carrera solo en el primerísimo arranque con los 4 servicios a la vez contra una base vacía (Postgres DDL es transaccional, el perdedor hace rollback limpio; solo ruido de log una vez en la vida del proyecto) | `db/migrations/001_init.sql` |
| EST-12 | ⚪ P3 | Cold starts de Render free sin mitigación confiable — el único candidato (push periódico del watcher) solo golpea `ingestaServer.js`, no los otros 3, y su intervalo (20 min) es más largo que la ventana típica de sueño (~15 min) | `scripts/watch-and-push.mjs:85-87,105` |
| EST-13 | 🟡 P2 | Sin ningún React Error Boundary en todo el frontend — un error de *render* (no de fetch) tumbaría el árbol de React completo en cualquier página. El fix de "sección caída no tapa las demás" cubre fallos de red, no de renderizado | — |

---

## 5. Escalabilidad

*(ESC-01 y ESC-02 ya están detallados en la sección de Estabilidad como
EST-03/EST-05, por ser el mismo hallazgo visto desde ambos ángulos.)*

### 🟡 / ⚪ Hallazgos medios y bajos

| ID | Prioridad | Hallazgo | Detalle | Referencia |
|---|---|---|---|---|
| ESC-03 | ℹ️ Informativo | Sesión sin cache, pega a Postgres en cada request | **No es bloqueante**: es un lookup por PK indexado, sin estado en memoria de proceso — el diseño ya soporta escalar `server.js` horizontalmente sin sticky sessions. El único techo real hoy es el plan free de Render (no soporta múltiples instancias), no el código | `session.js:63-90` |
| ESC-04 | 🟡 P2 | Import de hoja nueva hace `INSERT` fila por fila (patrón N+1) | Solo corre una vez por hoja (guardado por `imported_sheets`), no es costo por request — pero crecería linealmente si algún día se carga una hoja de miles de filas | `nodos.js:10-23` |
| ESC-05 | 🟡 P2 | `nodos.responsable` sin índice | Es exactamente la consulta de "tareas de un usuario" (Mi Perfil). Hoy imperceptible (volumen chico), primer candidato a indexar si la tabla crece | `routes/perfil.js:14-17` |
| ESC-06 | 🟡 P2 | Listado de usuarios admin hace `LATERAL JOIN` contra `audit_log` sin índice compuesto `(user_id, created_at)` | `audit_log` crece sin límite con el uso; `users` se mantiene chico. Costo crece con el tiempo de uso, no con la concurrencia | `sesionServer.js:36-40` |
| ESC-07 | ⚪ P3 | Sin caching (`Cache-Control`/`ETag`) ni `compression` en las rutas de datos | Irrelevante al volumen actual; sin esta capa, el costo de lectura escala 1:1 con el tráfico si crece | `server.js:40-66` |
| ESC-08 | ⚪ P3 | Frontend sin code-splitting por ruta (`React.lazy`/`Suspense`) | Bundle inicial hoy sigue siendo liviano en términos absolutos, pero no escala con el número de páginas nuevas | `frontend/src/App.jsx:1-18` |
| ESC-09 | ⚪ P3 | `render.yaml` no refleja instancias/plan reales de los otros 3 servicios | Gap de infraestructura-como-código: recrear el entorno desde cero depende de configuración manual no versionada en el dashboard de Render | `render.yaml:1-9` |

---

## 6. Calidad de software

### 🟠 CAL-01 — Frontend sin testing, linting ni formato configurado

**Objetivo:** confirmar el estado real de las herramientas de calidad automatizada
en frontend.

**Resultado hoy:** `frontend/package.json` no tiene ninguna dependencia de testing
(`vitest`/`jest`/`@testing-library/*`) ni de linting/formato (`eslint`/`prettier`).
Búsqueda en todo el repo confirma que no existe ningún archivo de configuración de
ESLint/Prettier/Husky, ni en `frontend/`, ni en `backend/`, ni en la raíz. El único
CI (`backend-ci.yml`) solo corre tests de `backend/**`; `deploy-pages.yml` solo hace
build+deploy, sin test ni lint. Como evidencia curiosa: `useIniciativaData.js:53` y
`Admin.jsx:76` tienen un comentario `// eslint-disable-next-line
react-hooks/exhaustive-deps` — un supresor de una regla de ESLint en un proyecto
donde ESLint ni siquiera está instalado.

**Resultado esperado:** ESLint configurado en frontend (con
`eslint-plugin-react-hooks` y, dado los hallazgos de accesibilidad de CAL-05,
`eslint-plugin-jsx-a11y`), corriendo en CI junto al build.

**Referencia:** `frontend/package.json`

---

### 🟠 CAL-02 — Frontend con 0% de cobertura de tests

**Objetivo:** confirmar el estado real de cobertura automatizada de frontend, en
contraste con el backend (que sí tiene buena cobertura).

**Resultado hoy:** cero archivos `*.test.jsx`/`*.test.js` en `frontend/src` (30
archivos fuente, 0 tests). El candidato más directo para el primer test es
`frontend/src/utils/dashboard.js` (137 líneas de funciones puras — `statusOf`,
`personColor`, `buildMonthGrid`, `summarizeTree`, etc. — sin JSX ni red).

**Resultado esperado:** introducir Vitest + Testing Library (encaja natural con Vite,
ya usado), empezando por `dashboard.js` y `useIniciativaData.js`, luego componentes
clave (`ProyectoFicha`, modales de nodo), y por último un flujo e2e crítico con
Playwright (login → ver iniciativa → editar nodo → cerrar sesión).

**Referencia:** `frontend/src/`

---

### 🟡 Hallazgos medios (P2)

| ID | Hallazgo | Detalle | Referencia |
|---|---|---|---|
| CAL-03 | `ProyectoFicha.jsx` no maneja un `proyectoId` inexistente | Si `findProyecto` devuelve `null` (URL inválida, ej. `/proyectos/6.9.9/kpi`), el título cae a un genérico pero `sheetId` llega `undefined` a la pestaña activa, que termina mostrando "No se pudo cargar el archivo: Error 404" — confuso para lo que en realidad es una URL inválida | `ProyectoFicha.jsx:8-9,76`, `useIniciativaData.js:12` |
| CAL-04 | Sin PropTypes/JSDoc de tipos/TypeScript — cero contrato de props en toda la app | Ej. `AddNodoModal.jsx:47` hace `iniciativas.length` sin default; si algún caller pasa `undefined`, truena en runtime, detectable solo por un usuario real | `frontend/src/components/AddNodoModal.jsx:5,47` |
| CAL-05 | Estados interactivos sin `aria-expanded`/`aria-pressed` en 6-7 vistas | Los botones de colapsar/expandir y selección (Gantt, Roadmap, MapaColor) dependen solo de `title` o de una clase CSS para el estado — un lector de pantalla no anuncia si están expandidos/seleccionados. No es el antipatrón grave (`<div onClick>` sin rol) — es semántica de estado faltante sobre una base ya correcta (`<button>` nativo) | `CartaGantt.jsx:169-200`, `Roadmap.jsx:153-170`, `MapaColor.jsx:113-184` |
| CAL-06 | Patrón loading/error duplicado literalmente en 6 páginas | El fetch de datos sí está bien compartido (`useIniciativaData` + `dashboard.js`) — lo que se repite carácter por carácter es solo el JSX de `{loading && ...}`/`{error && ...}`, fácil de extraer a un componente `<AsyncState>` | `Kpi.jsx:60-61`, `Roadmap.jsx:83-84`, `CartaGantt.jsx:100-101`, `MapaColor.jsx:91-92`, `DistribucionResponsable.jsx:30-31`, `ListadoHitos.jsx:81-82` |
| CAL-07 | Gaps menores de camino-negativo en tests de backend ya buenos | Falta test de `adminServer` inalcanzable (relevante porque es un servicio Render aparte), `entityType` no reconocido, y body vacío/sin `correo` en `/internal/login` | `routes/admin.test.js`, `sesionServer.test.js` |

### ⚪ Hallazgos bajos (P3)

| ID | Hallazgo | Detalle | Referencia |
|---|---|---|---|
| CAL-08 | `data/plan.js` hardcodeado sin validación cruzada con Postgres | Decisión de diseño consciente y documentada en CLAUDE.md, pero sigue siendo una superficie de desincronización silenciosa: un `sheetId` mal escrito en `plan.js` no tiene ningún chequeo automatizado que lo detecte | `frontend/src/data/plan.js` |
| CAL-09 | `AddNodoModal`/`EditNodoModal` casi duplicados | Repiten casi carácter por carácter el mismo bloque de campos (Nombre/Responsable/Inicio/Fin/% Avance) — extraíble a un `NodoFormFields` compartido | `AddNodoModal.jsx:89-110`, `EditNodoModal.jsx:42-63` |

---

## 7. Hoja de ruta sugerida

| Fase | Contenido | Esfuerzo aprox. |
|---|---|---|
| **Fase 0 — Ahora** | SEG-01, SEG-02, SEG-03, EST-01, EST-02 (los 5 P0) | M — son cambios acotados por archivo, no un rediseño |
| **Fase 1 — Próximas 2-4 semanas** | Los 9 P1: SEG-04 a SEG-08, EST-03 a EST-06, CAL-01, CAL-02 | L — CAL-02 en particular es un esfuerzo continuo, no un sprint |
| **Fase 2 — Backlog priorizado** | Los 15 P2 | Repartir junto con features nuevas, no en bloque |
| **Backlog** | Los 11 P3 | Oportunista — al tocar el archivo cercano por otra razón |

---

## 8. Herramientas recomendadas

| Área | Herramienta | Por qué |
|---|---|---|
| Tests unitarios/componentes frontend | Vitest + Testing Library | Cero fricción de config adicional: Vitest reutiliza la config de Vite que ya existe |
| E2E | Playwright | Cubre el flujo real login → panel → edición, incluyendo la cookie cross-domain |
| Lint | ESLint + `eslint-plugin-react-hooks` + `eslint-plugin-jsx-a11y` | El plugin de a11y ataca directamente CAL-05 de forma continua, no solo una vez |
| Seguridad — dependencias | `npm audit` (ya en uso) | Mantener la disciplina ya validada (react-router, archiver/uuid/unzipper) |
| Seguridad — dinámico | OWASP ZAP (baseline scan) contra un entorno de `/dev/` | Bajo esfuerzo, detecta lo obvio (headers faltantes, cookies mal configuradas) |
| Carga / límites de pool | `k6` o `autocannon` | Para reproducir EST-05/ESC-02 (agotamiento del pool) de forma controlada antes de que pase en producción |
| Resiliencia | `toxiproxy` o `tc`/`iptables` manual | Para simular la latencia/cuelgue de EST-02/EST-03 sin depender de que Postgres realmente falle |

---

## 9. Fuera de alcance de este plan

- Pentesting formal externo (este documento es una revisión de código, no una
  auditoría de caja negra con un tercero).
- Pruebas de carga a gran escala (miles de usuarios concurrentes) — el contexto real
  es uso interno universitario, no tráfico masivo.
- Auditoría legal/cumplimiento de datos personales (más allá de lo técnico ya
  cubierto en SEG-01).

---

## 10. Cómo correr los tests con Docker

La suite (`npm test` en `backend/`) necesita una Postgres real vía
`TEST_DATABASE_URL` — sin Docker ni Postgres nativo instalados, no corre. Mismo
usuario/clave/base que usa `.github/workflows/backend-ci.yml` en cada PR, así
que esto reproduce exactamente lo que ya se prueba en CI:

```bash
docker run -d --name panel-test-pg --rm -e POSTGRES_USER=panel -e POSTGRES_PASSWORD=panel -e POSTGRES_DB=panel_test -p 5433:5432 postgres:16-alpine
```

```bash
until docker exec panel-test-pg pg_isready -U panel -q; do sleep 1; done && cd backend && TEST_DATABASE_URL=postgres://panel:panel@localhost:5433/panel_test npm test
```

```bash
docker stop panel-test-pg
```

Puerto 5433 (no 5432) para no chocar con la Postgres de `docker-compose.yml` si
está corriendo en paralelo. Sin Docker, `brew install postgresql@16` es la
alternativa nativa más liviana (crear una base descartable con `createdb
panel_test` y usar esa URL).
