import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Fase 2: estos datos vendrán del Excel en SharePoint (panel_iniciativas.xlsx).
app.get("/api/indicadores", (req, res) => {
  res.json([]);
});

app.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
});
