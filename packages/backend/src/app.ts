import path from "node:path";
import cors from "cors";
import express from "express";
import { pool } from "./db/pool.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { modelsRouter } from "./routes/models.routes.js";
import { orthophotosRouter } from "./routes/orthophotos.routes.js";
import { measurementsRouter } from "./routes/measurements.routes.js";
import { annotationsRouter } from "./routes/annotations.routes.js";
import { statsRouter } from "./routes/stats.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { tourStopsRouter } from "./routes/tourStops.routes.js";
import { pageViewsRouter } from "./routes/pageViews.routes.js";
import { env } from "./config/env.js";
import { ensureLocalFile, uploadsRoot } from "./utils/fileCache.js";

export const app = express();

// Detrás de Railway/Render (proxy inverso): confia en el primer salto para que
// req.ip sea la IP real del visitante (de X-Forwarded-For) en vez de la del proxy.
// Usado para el registro de visitas (page_views), no para control de acceso.
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
// Antes de servir un archivo subido, se asegura que exista en el disco local -- si el
// disco efímero se borró en un redeploy/reinicio, lo descarga de R2 una sola vez. Sin R2
// configurado (desarrollo local) esto no hace nada y sigue el comportamiento de siempre.
app.use(
  "/uploads",
  async (req, _res, next) => {
    const relativeKey = req.path.replace(/^\/+/, "");
    try {
      await ensureLocalFile(relativeKey);
    } catch (err) {
      console.error(`No se pudo recuperar ${relativeKey} de R2:`, err);
    }
    next();
  },
  express.static(uploadsRoot),
);

app.get("/api/health", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    next(err);
  }
});

app.use("/api/models", modelsRouter);
app.use("/api/orthophotos", orthophotosRouter);
app.use("/api/measurements", measurementsRouter);
app.use("/api/annotations", annotationsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/auth", authRouter);
app.use("/api/tour-stops", tourStopsRouter);
app.use("/api/page-views", pageViewsRouter);

// En producción el backend también sirve el build estático del frontend
// (un solo servicio desplegable). En desarrollo esto queda vacío y el
// frontend lo sirve Vite por separado en su propio puerto.
if (env.frontendDistPath) {
  app.use(express.static(env.frontendDistPath));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(env.frontendDistPath, "index.html"));
  });
}

app.use(errorHandler);
