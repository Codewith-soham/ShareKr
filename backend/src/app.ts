import "dotenv/config";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { apiRouter } from "./routes/index.js";
import { ApiError } from "./utils/apiError.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dual mount: /health (root probe compatibility) and /api/v1 (versioned API)
app.use("/health", healthRoutes);
app.use("/api/v1", apiRouter);

// Catch-all for unmatched routes
app.use((req, _res, next) => {
  next(
    new ApiError(
      404,
      `Route ${req.method} ${req.originalUrl} not found`,
      "NOT_FOUND"
    )
  );
});

// Centralized error handling
app.use(errorHandler);

export { app };
