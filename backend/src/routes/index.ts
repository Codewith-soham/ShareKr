import { Router } from "express";
import { healthRoutes } from "../modules/health/health.routes.js";

const apiRouter = Router();

apiRouter.use("/health", healthRoutes);

export { apiRouter };
