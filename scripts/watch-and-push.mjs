import fs from "node:fs";
import path from "node:path";

const FILE_PATH = process.env.EXCEL_FILE_PATH;
const BACKEND_URL = process.env.BACKEND_URL || "https://panel-gestion-proyectos-backend.onrender.com";
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const BACKUP_INTERVAL_MS = Number(process.env.BACKUP_INTERVAL_MINUTES || 20) * 60 * 1000;
const DEBOUNCE_MS = 5000;

if (!FILE_PATH || !REFRESH_SECRET) {
  console.error("Faltan variables de entorno: EXCEL_FILE_PATH y/o REFRESH_SECRET.");
  process.exit(1);
}

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function pushFile(reason) {
  try {
    const buffer = await fs.promises.readFile(FILE_PATH);
    const res = await fetch(`${BACKEND_URL}/api/webhook/refresh`, {
      method: "POST",
      headers: {
        "x-refresh-secret": REFRESH_SECRET,
        "Content-Type": "application/octet-stream",
      },
      body: buffer,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      log(`error (${reason}): ${res.status} ${JSON.stringify(body)}`);
    } else {
      log(`enviado (${reason}), updatedAt=${body.updatedAt}`);
    }
  } catch (err) {
    log(`fallo al enviar (${reason}): ${err.message}`);
  }
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

log(`vigilando ${FILE_PATH}`);
pushFile("startup");
