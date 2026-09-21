import type { ZodType } from "zod";
import { AppError, type ErrorDetail } from "./errors";

/**
 * Validates unknown input against a Zod schema and returns the parsed value.
 * Every feature module uses this helper so that all endpoints report invalid
 * input in exactly the same way.
 *
 * @param schema the Zod schema describing the expected shape
 * @param input the unvalidated value, e.g. `request.body` or `request.query`
 * @param message the message shown to the client, e.g. "The bike could not be created."
 * @returns the parsed and typed value
 * @throws AppError 400 with one {@link ErrorDetail} per invalid field
 */
export function parseOrThrow<T>(
  schema: ZodType<T>,
  input: unknown,
  message: string,
): T {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  const details: ErrorDetail[] = result.error.issues.map((issue) => ({
    field: issue.path.join(".") || "(root)",
    message: issue.message,
  }));

  throw AppError.validation(message, details);
}
