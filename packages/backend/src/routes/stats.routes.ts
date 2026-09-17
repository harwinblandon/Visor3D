import { Router } from "express";
import * as controller from "../controllers/stats.controller.js";

export const statsRouter = Router();

statsRouter.get("/summary", controller.getSummary);
