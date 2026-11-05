import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError.js";

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      statusCode: err.statusCode,
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      data: null,
      details: err.details ?? null,
    });
    return;
  }

  const error = err instanceof Error ? err : new Error(String(err));
  console.error("Unhandled error:", error.message, error.stack);

  res.status(500).json({
    statusCode: 500,
    success: false,
    message: "Internal server error",
    errorCode: "INTERNAL_SERVER_ERROR",
    data: null,
    details: null,
  });
};
