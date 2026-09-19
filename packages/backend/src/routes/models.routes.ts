import { Router } from "express";
import { uploadModel as uploadModelMiddleware } from "../middleware/upload.js";
import { requireAdmin } from "../middleware/auth.js";
import * as controller from "../controllers/models.controller.js";
import { exportModel, exportAnnotations } from "../controllers/export.controller.js";

export const modelsRouter = Router();

modelsRouter.post("/", requireAdmin, uploadModelMiddleware.single("file"), controller.uploadModel);
modelsRouter.get("/", controller.listModels);
modelsRouter.get("/active", controller.getActiveModel);
modelsRouter.get("/:id", controller.getModelById);
modelsRouter.patch("/:id/activate", requireAdmin, controller.activateModel);
modelsRouter.delete("/:id", requireAdmin, controller.deleteModel);
modelsRouter.get("/:id/export", exportModel);
modelsRouter.get("/:id/export-annotations", exportAnnotations);
