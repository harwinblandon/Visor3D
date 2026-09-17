import { Router } from "express";
import { verifyAdminKey } from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/verify", verifyAdminKey);
