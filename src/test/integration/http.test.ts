import { describe, expect, it } from "vitest";
import { apiError, apiSuccess } from "@/lib/integration/http";

describe("integration response envelopes", () => {
  it("normalizes success responses", async () => {
    const response = apiSuccess("request-123", { ok: true }, 201);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      data: { ok: true },
      request_id: "request-123",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("normalizes safe errors", async () => {
    const response = apiError(
      "request-123",
      401,
      "invalid_client",
      "Valid client authentication is required",
    );
    expect(await response.json()).toEqual({
      error: {
        code: "invalid_client",
        message: "Valid client authentication is required",
        request_id: "request-123",
      },
    });
  });
});
