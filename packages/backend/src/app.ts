import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { pool } from "./db/pool.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { modelsRouter } from "./routes/models.routes.js";
import { measurementsRouter } from "./routes/measurements.routes.js";
import { annotationsRouter } from "./routes/annotations.routes.js";
import { statsRouter } from "./routes/stats.routes.js";
import { authRouter } from "./routes/auth.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "uploads");

export const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    next(err);
  }
});

app.use("/api/models", modelsRouter);
app.use("/api/measurements", measurementsRouter);
app.use("/api/annotations", annotationsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/auth", authRouter);

app.use(errorHandler);
