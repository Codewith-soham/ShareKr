import 'dotenv/config';
import { app } from './app.js';
import { env } from './config/env.js';
import { startAuthCleanupJob } from './jobs/auth-cleanup.js';
import { prisma } from './lib/prisma.js';

const port = env.PORT;

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const stopAuthCleanup = startAuthCleanupJob();

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  stopAuthCleanup();
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // Ignore disconnect errors during shutdown
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
