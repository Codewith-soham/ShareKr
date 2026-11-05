import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { apiRouter } from './routes/index.js';
import { ApiError } from './utils/apiError.js';

const app = express();

// Correct client IPs (rate limiting, audit) when running behind a reverse proxy.
app.set('trust proxy', env.TRUST_PROXY);
app.disable('x-powered-by');

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Dual mount: /health (root probe compatibility) and /api/v1 (versioned API)
app.use('/health', healthRoutes);
app.use('/api/v1', apiRouter);

// Catch-all for unmatched routes
app.use((req, _res, next) => {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`, 'NOT_FOUND'));
});

// Centralized error handling
app.use(errorHandler);

export { app };
