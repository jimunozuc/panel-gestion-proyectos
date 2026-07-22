import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { parseWorkbookBuffer } from "./parseWorkbook.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_FALLBACK = path.join(__dirname, "..", "data", "panel_iniciativas.xlsx");
const REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000; // fallback de seguridad cada 3 horas

let cache = null; // { sheets, updatedAt, source }
let refreshTimer = null;

async function fetchWorkbookBuffer() {
  const url = process.env.SHAREPOINT_XLSX_URL;
  if (url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`No se pudo descargar el Excel (${res.status} ${res.statusText})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFile(LOCAL_FALLBACK);
}

export async function refresh() {
  const buffer = await fetchWorkbookBuffer();
  const sheets = await parseWorkbookBuffer(buffer, { today: new Date() });
  cache = {
    sheets,
    updatedAt: new Date().toISOString(),
    source: process.env.SHAREPOINT_XLSX_URL ? "sharepoint" : "local-fallback",
  };
  return cache;
}

export async function getData() {
  if (!cache) {
    await refresh();
  }
  return cache;
}

export function startPeriodicRefresh() {
  if (refreshTimer) return;
  refreshTimer = setInterval(() => {
    refresh().catch((err) => console.error("Refresco periódico falló:", err.message));
  }, REFRESH_INTERVAL_MS);
  refreshTimer.unref?.();
}
