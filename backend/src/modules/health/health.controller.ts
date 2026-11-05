import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HealthService, healthService } from "./health.service.js";

export class HealthController {
  constructor(private readonly service: HealthService = healthService) {}

  public getLiveness = asyncHandler(async (_req: Request, res: Response) => {
    const data = this.service.checkLiveness();
    res.status(200).json(new ApiResponse(200, data, "Application is healthy"));
  });

  public getReadiness = asyncHandler(async (_req: Request, res: Response) => {
    const data = await this.service.checkReadiness();
    res.status(200).json(new ApiResponse(200, data, "Application is ready"));
  });
}

export const healthController = new HealthController();
