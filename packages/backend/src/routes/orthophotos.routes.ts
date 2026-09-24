import { Router } from "express";
import { uploadOrthophoto as uploadOrthophotoMiddleware, uploadOrthophotoLayer } from "../middleware/upload.js";
import { requireAdmin } from "../middleware/auth.js";
import * as controller from "../controllers/orthophotos.controller.js";
import * as layersController from "../controllers/orthophotoLayers.controller.js";

export const orthophotosRouter = Router();

orthophotosRouter.post("/", requireAdmin, uploadOrthophotoMiddleware.single("file"), controller.uploadOrthophoto);
orthophotosRouter.get("/", requireAdmin, controller.listOrthophotos);
orthophotosRouter.get("/:id", controller.getOrthophotoById);
orthophotosRouter.get("/:id/tiles/:z/:x/:y", controller.getTile);
orthophotosRouter.patch("/:id", requireAdmin, controller.updateOrthophoto);
orthophotosRouter.patch("/:id/publish", requireAdmin, controller.setPublished);
orthophotosRouter.delete("/:id", requireAdmin, controller.deleteOrthophoto);

orthophotosRouter.post("/:id/layers", requireAdmin, uploadOrthophotoLayer.single("file"), layersController.uploadLayer);
orthophotosRouter.get("/:id/layers", layersController.listLayers);
orthophotosRouter.delete("/:id/layers/:layerId", requireAdmin, layersController.deleteLayer);

orthophotosRouter.post("/:id/terrain", requireAdmin, uploadOrthophotoMiddleware.single("file"), controller.uploadTerrain);
orthophotosRouter.delete("/:id/terrain", requireAdmin, controller.deleteTerrain);
orthophotosRouter.get("/:id/terrain-tiles/:z/:x/:y", controller.getTerrainTile);
