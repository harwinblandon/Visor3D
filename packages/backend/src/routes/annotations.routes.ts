import { Router } from "express";
import { uploadPhotos } from "../middleware/upload.js";
import { requireAdmin } from "../middleware/auth.js";
import * as controller from "../controllers/annotations.controller.js";

export const annotationsRouter = Router();

annotationsRouter.post("/", controller.createAnnotation);
annotationsRouter.get("/", controller.listAnnotations);
annotationsRouter.get("/:id", controller.getAnnotation);
annotationsRouter.patch("/:id", controller.updateAnnotation);
annotationsRouter.delete("/:id", controller.deleteAnnotation);
annotationsRouter.post("/:id/photos", requireAdmin, uploadPhotos.array("files", 10), controller.addPhotos);
annotationsRouter.delete("/:id/photos/:photoId", requireAdmin, controller.deletePhoto);
