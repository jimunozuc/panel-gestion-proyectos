import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { parseWorkbookBuffer } from "./parseWorkbook.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_FALLBACK = path.join(__dirname, "..", "data", "panel_iniciativas.xlsx");

let cache = null; // { sheets, updatedAt, source }

async function loadFromBuffer(buffer, source) {
  const sheets = await parseWorkbookBuffer(buffer, { today: new Date() });
  cache = { sheets, updatedAt: new Date().toISOString(), source };
  return cache;
}

export async function refreshFromUpload(buffer) {
  return loadFromBuffer(buffer, "power-automate");
}

async function refreshFromLocalFallback() {
  const buffer = await fs.readFile(LOCAL_FALLBACK);
  return loadFromBuffer(buffer, "local-fallback");
}

export async function getData() {
  if (!cache) {
    await refreshFromLocalFallback();
  }
  return cache;
}
