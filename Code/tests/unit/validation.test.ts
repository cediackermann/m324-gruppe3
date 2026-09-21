import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { parseOrThrow } from "../../src/shared/validation";
import { AppError, type ErrorDetail } from "../../src/shared/errors";

/** Small example schema, standing in for a real module schema. */
const exampleSchema = z.object({
  name: z.string().trim().min(1, "name must not be empty"),
  size: z.coerce
    .number({ error: "size must be a number" })
    .int("size must be a whole number"),
});

describe("parseOrThrow", () => {
  /**
   * Happy path: valid input is returned parsed, including Zod's coercion
   * and trimming.
   *
   * @expected the trimmed name and the numeric size
   */
  test("returns the parsed value for valid input", () => {
    const result = parseOrThrow(
      exampleSchema,
      { name: "  Widget ", size: "15" },
      "invalid",
    );

    expect(result).toEqual({ name: "Widget", size: 15 });
  });

  /**
   * Sad path: every invalid field is reported, so the client can correct
   * all of them at once.
   *
   * @expected an AppError 400 with one detail per invalid field
   */
  test("throws a 400 AppError listing every invalid field", () => {
    let caught: unknown;
    try {
      parseOrThrow(
        exampleSchema,
        { name: "", size: "abc" },
        "The example is invalid.",
      );
    } catch (error) {
      caught = error;
    }

    const error = caught as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("The example is invalid.");
    expect(
      (error.details as ErrorDetail[]).map((detail) => detail.field).sort(),
    ).toEqual(["name", "size"]);
  });

  /**
   * Sad path: input of the wrong type has no field path, so the detail
   * falls back to "(root)".
   *
   * @expected a single detail with the field "(root)"
   */
  test('uses "(root)" when the issue has no field path', () => {
    let caught: unknown;
    try {
      parseOrThrow(exampleSchema, "not an object", "The example is invalid.");
    } catch (error) {
      caught = error;
    }

    const details = (caught as AppError).details as ErrorDetail[];
    expect(details).toHaveLength(1);
    expect(details[0]!.field).toBe("(root)");
  });
});
