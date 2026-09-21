import type { FastifyError, FastifyInstance } from "fastify";
import { AppError, type ErrorResponse } from "./shared/errors";

/**
 * Registers the error and not-found handlers shared by every endpoint, so
 * a failure anywhere in the app leaves it in the same
 * `{ error: { code, message, details } }` shape.
 *
 * @param app the Fastify instance to register the handlers on
 */
export function registerErrorHandling(app: FastifyInstance): void {
  // Every failure leaves the app through here, so the error body is identical
  // across all endpoints.
  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(error.toResponse());
    }

    // Fastify's own errors (e.g. malformed JSON) already carry a 4xx status.
    const status = (error as FastifyError).statusCode;
    if (typeof status === "number" && status < 500) {
      const body: ErrorResponse = {
        error: { code: "VALIDATION_ERROR", message: error.message },
      };
      return reply.status(status).send(body);
    }

    // Anything else is a bug: log it, but never leak internals to the client.
    request.log.error(error);
    const body: ErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    };
    return reply.status(500).send(body);
  });

  app.setNotFoundHandler((request, reply) => {
    const body: ErrorResponse = {
      error: {
        code: "NOT_FOUND",
        message: `No route ${request.method} ${request.url}.`,
      },
    };
    return reply.status(404).send(body);
  });
}
