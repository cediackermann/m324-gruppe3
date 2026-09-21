import { describe, expect, test } from "bun:test";
import Fastify from "fastify";
import { registerErrorHandling } from "../../src/error-handling";
import { AppError } from "../../src/shared/errors";

describe("registerErrorHandling", () => {
  /**
   * Sad path: an {@link AppError} thrown inside a route is translated into
   * the shared error body with its own status code.
   *
   * @expected status 409 and `{ error: { code: "CONFLICT", message } }`
   */
  test("turns an AppError into the shared error body", async () => {
    const app = Fastify({ logger: false });
    registerErrorHandling(app);
    app.get("/boom", async () => {
      throw AppError.conflict("Frame number already exists.");
    });

    const response = await app.inject({ method: "GET", url: "/boom" });

    expect(response.statusCode).toBe(409);
    expect(response.json<Record<string, unknown>>()).toEqual({
      error: { code: "CONFLICT", message: "Frame number already exists." },
    });
    await app.close();
  });

  /**
   * Sad path: an unexpected error must not leak internals to the client.
   *
   * @expected status 500 and the generic INTERNAL_ERROR body
   */
  test("hides unexpected errors behind a 500", async () => {
    const app = Fastify({ logger: false });
    registerErrorHandling(app);
    app.get("/crash", async () => {
      throw new Error("database password is hunter2");
    });

    const response = await app.inject({ method: "GET", url: "/crash" });

    expect(response.statusCode).toBe(500);
    expect(response.json<Record<string, unknown>>()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
    });
    expect(response.body).not.toContain("hunter2");
    await app.close();
  });

  /**
   * Sad path: a malformed JSON body is rejected by Fastify itself, but must
   * still leave the app in the shared error format.
   *
   * @expected status 400 and code VALIDATION_ERROR
   */
  test("answers malformed JSON in the shared error format", async () => {
    const app = Fastify({ logger: false });
    registerErrorHandling(app);
    app.post("/echo", async (request) => request.body);

    const response = await app.inject({
      method: "POST",
      url: "/echo",
      headers: { "content-type": "application/json" },
      payload: "{ not json",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("VALIDATION_ERROR");
    await app.close();
  });

  /**
   * Sad path: an unknown route uses the same error format as everything else.
   *
   * @expected status 404 and code NOT_FOUND
   */
  test("answers an unknown route in the shared error format", async () => {
    const app = Fastify({ logger: false });
    registerErrorHandling(app);

    const response = await app.inject({ method: "GET", url: "/does-not-exist" });

    expect(response.statusCode).toBe(404);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("NOT_FOUND");
    await app.close();
  });
});
