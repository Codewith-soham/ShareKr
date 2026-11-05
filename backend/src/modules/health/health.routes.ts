import { Router } from "express";
import { healthController } from "./health.controller.js";

const router = Router();

router.get("/", healthController.getLiveness);
router.get("/live", healthController.getLiveness);
router.get("/ready", healthController.getReadiness);

export { router as healthRoutes };
