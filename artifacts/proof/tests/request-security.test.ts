import { afterEach, describe, expect, it, vi } from "vitest";
import {
  enforceRateLimit,
  enforceSameOrigin,
  logSecurityEvent,
  resetRateLimitsForTesting,
} from "../lib/server/security";

function request(
  headers: Record<string, string> = {},
  path = "/proof-api/auth/sign-in",
) {
  return new Request(`https://proof.example${path}`, {
    method: "POST",
    headers,
  });
}

afterEach(() => {
  resetRateLimitsForTesting();
  vi.restoreAllMocks();
});

describe("Slice 1 request security", () => {
  it("accepts same-origin mutations", () => {
    expect(
      enforceSameOrigin(
        request({
          origin: "https://proof.example",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toBeNull();
  });

  it("rejects cross-origin mutations without CORS authorization", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = enforceSameOrigin(
      request({
        origin: "https://attacker.invalid",
        "sec-fetch-site": "cross-site",
      }),
    );

    expect(response?.status).toBe(403);
    expect(response?.headers.get("access-control-allow-origin")).toBeNull();
    await expect(response?.json()).resolves.toEqual({
      error: "cross_origin_request_rejected",
    });
  });

  it("enforces a fixed-window mutation limit", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const limitedRequest = request({ "x-forwarded-for": "192.0.2.10" });
    const options = { scope: "test", limit: 2, windowMs: 60_000 };

    expect(enforceRateLimit(limitedRequest, options)).toBeNull();
    expect(enforceRateLimit(limitedRequest, options)).toBeNull();
    const response = enforceRateLimit(limitedRequest, options);

    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBe("60");
    await expect(response?.json()).resolves.toEqual({
      error: "rate_limit_exceeded",
    });
  });

  it("emits structured security events without request secrets", () => {
    const output: string[] = [];
    vi.spyOn(console, "info").mockImplementation((value) => {
      output.push(String(value));
    });
    const securedRequest = request({
      authorization: "Bearer must-not-be-logged",
      cookie: "session=must-not-be-logged",
      "x-request-id": "request-123",
    });

    logSecurityEvent("auth.sign_in", securedRequest, "failed", {
      upstreamStatus: 401,
    });

    expect(output).toHaveLength(1);
    expect(JSON.parse(output[0] ?? "{}")).toMatchObject({
      type: "security_event",
      event: "auth.sign_in",
      outcome: "failed",
      requestId: "request-123",
      method: "POST",
      path: "/proof-api/auth/sign-in",
      upstreamStatus: 401,
    });
    expect(output[0]).not.toContain("must-not-be-logged");
  });
});