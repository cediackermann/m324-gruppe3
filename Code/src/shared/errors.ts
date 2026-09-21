/**
 * Shared error handling for every endpoint of the app.
 *
 * All endpoints answer failures with the same body shape:
 * `{ error: { code, message, details? } }`.
 */

/**
 * Machine readable error codes. Feature modules use these generic codes;
 * if a module needs a more specific one (e.g. "DUPLICATE_FRAME_NUMBER"),
 * add it to this union so the contract stays in one place.
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

/** One invalid field, so the client knows what to correct. */
export interface ErrorDetail {
  field: string;
  message: string;
}

/** Body returned to the client for every failed request. */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

/**
 * An error that carries the HTTP status and the error code it should be
 * reported with. Thrown by the service layer, translated into a response
 * by the central error handler in {@link buildApp}.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  /** 400 — the request was understood but the input is invalid. */
  static validation(message: string, details?: ErrorDetail[]): AppError {
    return new AppError(400, "VALIDATION_ERROR", message, details);
  }

  /** 404 — the requested resource does not exist. */
  static notFound(message: string): AppError {
    return new AppError(404, "NOT_FOUND", message);
  }

  /** 409 — the request conflicts with the current state (e.g. a duplicate). */
  static conflict(message: string): AppError {
    return new AppError(409, "CONFLICT", message);
  }

  /** 503 — a dependency (e.g. another endpoint) could not be reached. */
  static unavailable(message: string): AppError {
    return new AppError(503, "SERVICE_UNAVAILABLE", message);
  }

  /** Serialises this error into the shared response body. */
  toResponse(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details === undefined ? {} : { details: this.details }),
      },
    };
  }
}
