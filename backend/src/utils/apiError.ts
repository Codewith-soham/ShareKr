// Standardized custom API error class.

class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly data: null;
  public readonly success: boolean;
  public readonly details: unknown;

  constructor(
    statusCode: number,
    message: string = "Something went wrong",
    errorCode: string = "ERROR",
    details: unknown = null
  ) {
    super(message);

    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.data = null;
    this.success = false;
    this.details = details;

    // Restore the prototype chain for reliable instanceof checks.
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture a clean stack trace in Node.js.
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export { ApiError };
