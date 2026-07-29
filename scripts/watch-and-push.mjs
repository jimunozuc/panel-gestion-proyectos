import fs from "node:fs";
import path from "node:path";

const FILE_PATH = process.env.EXCEL_FILE_PATH;
const BACKUP_INTERVAL_MS = Number(process.env.BACKUP_INTERVAL_MINUTES || 20) * 60 * 1000;
const DEBOUNCE_MS = 5000;

// Uno o varios backends de destino. Por defecto (compatible con el setup de
// siempre) es un solo destino armado desde BACKEND_URL/REFRESH_SECRET. Para
// empujar a varios backends en paralelo (ej. /, /app/ y /dev/ — cada uno con
// su propio REFRESH_SECRET, ver README "Origen de datos"), definir
// PUSH_TARGETS_JSON con un array JSON, ej.:
// PUSH_TARGETS_JSON='[{"name":"prod","url":"https://panel-gestion-proyectos-backend.onrender.com","secret":"..."},{"name":"app","url":"https://panel-gestion-proyectos-prd.onrender.com","secret":"..."},{"name":"dev","url":"https://panel-gestion-proyectos.onrender.com","secret":"..."}]'
function resolveTargets() {
  const json = process.env.PUSH_TARGETS_JSON;
  if (json) {
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch (err) {
      console.error(`PUSH_TARGETS_JSON no es JSON válido (${err.message}).`);
      process.exit(1);
    }
    if (!Array.isArray(parsed) || !parsed.length) {
      console.error("PUSH_TARGETS_JSON debe ser un array con al menos un destino.");
      process.exit(1);
    }
    const invalid = parsed.filter((t) => !t?.url || !t?.secret);
    if (invalid.length) {
      console.error("Cada destino de PUSH_TARGETS_JSON necesita 'url' y 'secret'.");
      process.exit(1);
    }
    return parsed.map((t) => ({ name: t.name || t.url, url: t.url, secret: t.secret }));
  }

  const url = process.env.BACKEND_URL || "https://panel-gestion-proyectos-backend.onrender.com";
  const secret = process.env.REFRESH_SECRET;
  if (!secret) {
    console.error("Faltan variables de entorno: REFRESH_SECRET (o PUSH_TARGETS_JSON).");
    process.exit(1);
  }
  return [{ name: url, url, secret }];
}

if (!FILE_PATH) {
  console.error("Falta la variable de entorno EXCEL_FILE_PATH.");
  process.exit(1);
}

const TARGETS = resolveTargets();

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function pushOne(target, reason, buffer) {
  try {
    const res = await fetch(`${target.url}/api/webhook/refresh`, {
      method: "POST",
      headers: {
        "x-refresh-secret": target.secret,
        "Content-Type": "application/octet-stream",
      },
      body: buffer,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      log(`error [${target.name}] (${reason}): ${res.status} ${JSON.stringify(body)}`);
    } else {
      log(`enviado [${target.name}] (${reason}), updatedAt=${body.updatedAt}`);
    }
  } catch (err) {
    log(`fallo al enviar [${target.name}] (${reason}): ${err.message}`);
  }
}

async function pushFile(reason) {
  let buffer;
  try {
    buffer = await fs.promises.readFile(FILE_PATH);
  } catch (err) {
    log(`no se pudo leer ${FILE_PATH}: ${err.message}`);
    return;
  }
  // allSettled: un destino caído (ej. cold start de Render) no debe frenar
  // el envío a los demás.
  await Promise.allSettled(TARGETS.map((t) => pushOne(t, reason, buffer)));
}

let debounceTimer = null;
function scheduleWatchPush() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => pushFile("watch"), DEBOUNCE_MS);
}

const dir = path.dirname(FILE_PATH);
const filename = path.basename(FILE_PATH);

fs.watch(dir, (_eventType, changedFilename) => {
  if (changedFilename === filename) {
    scheduleWatchPush();
  }
});

setInterval(() => pushFile("backup"), BACKUP_INTERVAL_MS);

log(`vigilando ${FILE_PATH} → ${TARGETS.length} destino(s): ${TARGETS.map((t) => t.name).join(", ")}`);
pushFile("startup");
