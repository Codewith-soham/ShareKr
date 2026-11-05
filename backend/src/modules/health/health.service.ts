import { ApiError } from "../../utils/apiError.js";
import { HealthRepository, healthRepository } from "./health.repository.js";

export interface LivenessStatus {
  status: "UP";
  uptime: number;
  timestamp: string;
}

export interface ReadinessStatus {
  status: "UP";
  database: "UP";
  uptime: number;
  timestamp: string;
}

export class HealthService {
  constructor(private readonly repo: HealthRepository = healthRepository) {}

  public checkLiveness(): LivenessStatus {
    return {
      status: "UP",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  public async checkReadiness(): Promise<ReadinessStatus> {
    try {
      await this.repo.pingDatabase();
      return {
        status: "UP",
        database: "UP",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ApiError(
        503,
        "Database connectivity check failed",
        "SERVICE_UNAVAILABLE",
        { database: "DOWN" }
      );
    }
  }
}

export const healthService = new HealthService();
