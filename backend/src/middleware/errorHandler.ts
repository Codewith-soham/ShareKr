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

  // Errors raised by express.json() / urlencoded() are client mistakes, not server faults.
  const bodyError = err as { type?: string };
  if (bodyError?.type === "entity.too.large") {
    res.status(413).json({
      statusCode: 413,
      success: false,
      message: "Request body too large",
      errorCode: "PAYLOAD_TOO_LARGE",
      data: null,
      details: null,
    });
    return;
  }
  if (bodyError?.type === "entity.parse.failed") {
    res.status(400).json({
      statusCode: 400,
      success: false,
      message: "Malformed JSON body",
      errorCode: "INVALID_JSON",
      data: null,
      details: null,
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
