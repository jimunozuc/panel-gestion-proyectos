import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getData } from "./dataSource.js";
import { runMigrations } from "./db/migrate.js";
import { attachUser } from "./session.js";
import { sessionRouter } from "./routes/session.js";
import { nodosRouter } from "./routes/nodos.js";
import { adminRouter } from "./routes/admin.js";
import { perfilRouter } from "./routes/perfil.js";
import { loadSheetFromDb } from "./nodos.js";

const app = express();
const PORT = process.env.PORT || 3001;

export { app };

// En producción, CORS_ORIGIN debe ser la URL exacta del frontend. En local
// se acepta cualquier puerto de localhost (Vite y las previews cambian de
// puerto seguido) para no tener que fijarlo a mano en cada sesión.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || /^http:\/\/localhost:\d+$/,
    credentials: true,
  })
);
// El fallback solo es alcanzable en desarrollo local: start() aborta el
// arranque en producción si COOKIE_SECRET no está seteada, así que este
// string nunca llega a firmar una cookie que un usuario real vea.
const COOKIE_SECRET_DEV_ONLY = "dev-secret-solo-para-desarrollo-local";
app.use(cookieParser(process.env.COOKIE_SECRET || COOKIE_SECRET_DEV_ONLY));
app.use(express.json());
app.use(attachUser);

app.use("/api", sessionRouter);
app.use("/api", nodosRouter);
app.use("/api", adminRouter);
app.use("/api", perfilRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/iniciativas/:num", async (req, res) => {
  // Postgres es la única fuente para leer: la importación ya pasó (o no)
  // cuando llegó el Excel por el webhook, no acá. El fallback al Excel en
  // memoria es solo para cuando Postgres mismo falla (no configurado, caído),
  // no para "todavía no se importó" — eso es un 404 real, no un degradado.
  try {
    const fromDb = await loadSheetFromDb(req.params.num);
    if (fromDb) {
      res.json({ ...fromDb, source: "postgres", editable: true });
      return;
    }
    res.status(404).json({ error: `No existe la hoja "${req.params.num}"` });
  } catch (dbErr) {
    console.warn("Postgres no disponible, sirviendo datos del Excel en memoria:", dbErr.message);
    try {
      const data = await getData();
      const sheet = data.sheets[req.params.num];
      if (!sheet) {
        res.status(404).json({ error: `No existe la hoja "${req.params.num}"` });
        return;
      }
      res.json({ ...sheet, updatedAt: data.updatedAt, source: data.source, editable: false });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
});

async function start() {
  if (process.env.NODE_ENV === "production" && !process.env.COOKIE_SECRET) {
    console.error("COOKIE_SECRET es obligatorio en producción — abortando arranque.");
    process.exit(1);
  }

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

// Guard de entrypoint: al importar `app` desde un test (supertest) no
// queremos levantar el puerto ni correr migraciones de nuevo.
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
