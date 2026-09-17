import { Router } from "express";
import * as controller from "../controllers/measurements.controller.js";

export const measurementsRouter = Router();

measurementsRouter.post("/", controller.createMeasurement);
measurementsRouter.get("/", controller.listMeasurements);
measurementsRouter.delete("/:id", controller.deleteMeasurement);
