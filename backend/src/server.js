import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getData, refreshFromUpload } from "./dataSource.js";
import { runMigrations } from "./db/migrate.js";
import { attachUser } from "./session.js";
import { sessionRouter } from "./routes/session.js";
import { nodosRouter } from "./routes/nodos.js";
import { adminRouter } from "./routes/admin.js";
import { importSheetIfEmpty, loadSheetFromDb } from "./nodos.js";

const app = express();
const PORT = process.env.PORT || 3001;

// En producción, CORS_ORIGIN debe ser la URL exacta del frontend. En local
// se acepta cualquier puerto de localhost (Vite y las previews cambian de
// puerto seguido) para no tener que fijarlo a mano en cada sesión.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || /^http:\/\/localhost:\d+$/,
    credentials: true,
  })
);
app.use(cookieParser(process.env.COOKIE_SECRET || "dev-secret-cambiar-en-produccion"));

// Va antes de express.json(): necesita leer el body como binario crudo, no
// como JSON (ver README, sección "Origen de datos").
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
      res.json({ status: "ok", updatedAt: data.updatedAt });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.use(express.json());
app.use(attachUser);

app.use("/api", sessionRouter);
app.use("/api", nodosRouter);
app.use("/api", adminRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/iniciativas/:num", async (req, res) => {
  try {
    const data = await getData();
    const sheet = data.sheets[req.params.num];

    // Postgres se consulta primero (y de forma independiente de si el Excel
    // en memoria trae esta hoja hoy): así una hoja ya migrada sigue
    // disponible después de un reinicio del backend, aunque el cache en
    // memoria haya vuelto a poblarse desde el Excel de ejemplo local.
    try {
      if (sheet) await importSheetIfEmpty(req.params.num, sheet);
      const fromDb = await loadSheetFromDb(req.params.num);
      if (fromDb) {
        res.json({
          ...fromDb,
          // La hoja ya vive en Postgres: manda su propia fecha de última
          // edición. data.updatedAt es del cache del Excel y solo sirve
          // como respaldo si por algún motivo no hubiera updated_at.
          updatedAt: fromDb.updatedAt || data.updatedAt,
          source: "postgres",
          editable: true,
        });
        return;
      }
    } catch (dbErr) {
      console.warn("Postgres no disponible, sirviendo datos del Excel en memoria:", dbErr.message);
    }

    if (!sheet) {
      res.status(404).json({ error: `No existe la hoja "${req.params.num}"` });
      return;
    }
    res.json({ ...sheet, updatedAt: data.updatedAt, source: data.source, editable: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function start() {
  try {
    await runMigrations();
    console.log("Migraciones de Postgres aplicadas.");
  } catch (err) {
    console.warn(
      "No se pudo conectar a Postgres — el panel sigue funcionando en modo solo lectura desde el Excel. Detalle:",
      err.message
    );
  }

  app.listen(PORT, () => {
    console.log(`Backend escuchando en http://localhost:${PORT}`);
  });
}

start();
