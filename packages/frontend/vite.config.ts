import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // maplibre-gl carga su web worker con una URL relativa a su propio archivo; si Vite lo
  // pre-empaqueta (esbuild) esa URL se rompe y el worker da 404 en dev (las fuentes GeoJSON
  // quedan “vacías” en silencio porque el procesamiento ocurre en el worker).
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  server: {
    proxy: {
      "/api": "http://localhost:4000",
      "/uploads": "http://localhost:4000",
    },
  },
});
