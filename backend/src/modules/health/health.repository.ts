import { prisma } from "../../lib/prisma.js";

export class HealthRepository {
  public async pingDatabase(): Promise<boolean> {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  }
}

export const healthRepository = new HealthRepository();
