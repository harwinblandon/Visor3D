import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import * as controller from "../controllers/pageViews.controller.js";

export const pageViewsRouter = Router();

pageViewsRouter.get("/summary", requireAdmin, controller.getSummary);
