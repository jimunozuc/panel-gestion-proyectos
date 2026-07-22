import express from "express";
import cors from "cors";
import { getData, refresh, startPeriodicRefresh } from "./dataSource.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

app.post("/api/webhook/refresh", async (req, res) => {
  const expected = process.env.REFRESH_SECRET;
  const provided = req.get("x-refresh-secret") || req.query.secret;
  if (expected && provided !== expected) {
    res.status(401).json({ error: "Secreto inválido" });
    return;
  }
  try {
    const data = await refresh();
    res.json({ status: "ok", updatedAt: data.updatedAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
  startPeriodicRefresh();
});
