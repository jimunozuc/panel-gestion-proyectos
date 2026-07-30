import express from "express";
import { refreshFromUpload } from "./dataSource.js";
import { runMigrations } from "./db/migrate.js";
import { importAllSheets } from "./nodos.js";

const app = express();
const PORT = process.env.PORT || 3002;

export { app };

// Sin cors ni cookie-parser: el único caller es scripts/watch-and-push.mjs
// vía fetch de Node (no un browser, CORS no aplica) y la única auth es el
// header x-refresh-secret (sin cookies ni sesión). Tampoco hay express.json():
// la única ruta de este servicio lee el body como bytes crudos (el .xlsx),
// no como JSON.
app.post(
  "/api/webhook/refresh",
  express.raw({ type: () => true, limit: "10mb" }),
  async (req, res) => {
    const expected = process.env.REFRESH_SECRET;
    const provided = req.get("x-refresh-secret");
    if (expected && provided !== expected) {
      res.status(401).json({ error: "Secreto inválido" });
      return;
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Falta el contenido del archivo en el body" });
      return;
    }
    try {
      const data = await refreshFromUpload(req.body);
      await importAllSheets(data.sheets);
      res.json({ status: "ok", updatedAt: data.updatedAt });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "ingesta" });
});

async function start() {
  try {
    await runMigrations();
    console.log("Migraciones de Postgres aplicadas.");
  } catch (err) {
    console.warn(
      "No se pudo conectar a Postgres — el servicio de ingesta sigue arriba pero no podrá importar nada hasta que Postgres esté disponible. Detalle:",
      err.message
    );
  }

  app.listen(PORT, () => {
    console.log(`Ingesta escuchando en http://localhost:${PORT}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
