import express from "express";
import cors from "cors";
import { getData, refreshFromUpload } from "./dataSource.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Restringido al origen real de GitHub Pages vía CORS_ORIGIN; sin esa env
// var, solo acepta localhost (evita quedar abierto a cualquier origen).
app.use(cors({ origin: process.env.CORS_ORIGIN || /^http:\/\/localhost:\d+$/ }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/iniciativas/:num", async (req, res) => {
  try {
    const data = await getData();
    const sheet = data.sheets[req.params.num];
    if (!sheet) {
      res.status(404).json({ error: `No existe la hoja "${req.params.num}"` });
      return;
    }
    res.json({ ...sheet, updatedAt: data.updatedAt, source: data.source });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
});
