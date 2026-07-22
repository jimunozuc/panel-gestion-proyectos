import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base:
    process.env.BASE_PATH ||
    (process.env.NODE_ENV === "production" ? "/panel-gestion-proyectos/" : "/"),
  server: {
    port: 5173,
  },
});
