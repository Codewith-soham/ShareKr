import type { Request, Response, NextFunction, RequestHandler } from "express";

// Wraps asynchronous route handlers and forwards errors
// to Express's centralized error-handling middleware.

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown> | unknown;

const asyncHandler = (
  requestHandler: AsyncRequestHandler
): RequestHandler => {
  return (req, res, next): void => {
    Promise.resolve(requestHandler(req, res, next)).catch(next);
  };
};

export { asyncHandler };