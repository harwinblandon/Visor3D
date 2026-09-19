import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import * as controller from "../controllers/tourStops.controller.js";

export const tourStopsRouter = Router();

tourStopsRouter.post("/", requireAdmin, controller.createTourStop);
tourStopsRouter.get("/", controller.listTourStops);
tourStopsRouter.delete("/:id", requireAdmin, controller.deleteTourStop);
tourStopsRouter.patch("/:id/move", requireAdmin, controller.moveTourStop);
