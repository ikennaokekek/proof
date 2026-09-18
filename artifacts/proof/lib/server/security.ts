import "server-only";

import { createHash, randomUUID } from "node:crypto";

type RateLimitOptions = {
  scope: string;
  limit: number;
  windowMs: number;
  subject?: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type SecurityEvent =
  | "auth.sign_in"
  | "auth.sign_out"
  | "auth.sign_up"
  | "organization.create"
  | "membership.invitation_create"
  | "membership.invitation_revoke"
  | "membership.invitation_accept"
  | "membership.change"
  | "membership.suspend"
  | "membership.reactivate"
  | "authority.grant"
  | "authority.grant_requested"
  | "authority.approve"
  | "authority.revoke"
  | "request.csrf_rejected"
  | "request.rate_limited";

const rateLimitBuckets = new Map<string, RateLimitBucket>();

function requestPath(request: Request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "unknown";
  }
}

function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",", 1)[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function rateLimitKey(request: Request, options: RateLimitOptions) {
  const input = [
    options.scope,
    clientAddress(request),
    options.subject?.trim().toLowerCase() ?? "",
  ].join("\u0000");
  return createHash("sha256").update(input).digest("hex");
}

function cleanupExpiredBuckets(now: number) {
  if (rateLimitBuckets.size < 1_000) return;
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}

export function logSecurityEvent(
  event: SecurityEvent,
  request: Request,
  outcome: "allowed" | "denied" | "failed" | "succeeded",
  details: Record<string, string | number | boolean | null> = {},
) {
  const suppliedRequestId = request.headers.get("x-request-id");
  const requestId =
    suppliedRequestId && /^[A-Za-z0-9._:-]{1,128}$/.test(suppliedRequestId)
      ? suppliedRequestId
      : randomUUID();

  console.info(
    JSON.stringify({
      type: "security_event",
      event,
      outcome,
      requestId,
      method: request.method,
      path: requestPath(request),
      timestamp: new Date().toISOString(),
      ...details,
    }),
  );
}

export function enforceSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const expectedOrigin = new URL(request.url).origin;

  if (
    (origin !== null && origin !== expectedOrigin) ||
    fetchSite === "cross-site"
  ) {
    logSecurityEvent("request.csrf_rejected", request, "denied");
    return Response.json(
      { error: "cross_origin_request_rejected" },
      { status: 403 },
    );
  }

  return null;
}

export function enforceRateLimit(
  request: Request,
  options: RateLimitOptions,
): Response | null {
  const now = Date.now();
  cleanupExpiredBuckets(now);
  const key = rateLimitKey(request, options);
  const existing = rateLimitBuckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + options.windowMs };

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  if (bucket.count <= options.limit) return null;

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000));
  logSecurityEvent("request.rate_limited", request, "denied", {
    scope: options.scope,
    retryAfter,
  });
  return Response.json(
    { error: "rate_limit_exceeded" },
    {
      status: 429,
      headers: {
        "cache-control": "no-store",
        "retry-after": String(retryAfter),
      },
    },
  );
}

export function protectMutation(
  request: Request,
  options: RateLimitOptions,
): Response | null {
  return enforceSameOrigin(request) ?? enforceRateLimit(request, options);
}

export function resetRateLimitsForTesting() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Rate-limit reset is available only in tests");
  }
  rateLimitBuckets.clear();
}