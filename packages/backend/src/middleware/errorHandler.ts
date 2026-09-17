import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  const status = typeof err.status === "number" ? err.status : 500;
  res.status(status).json({ error: err.message ?? "Internal server error" });
};
