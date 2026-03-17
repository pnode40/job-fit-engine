import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Returns true if the request is allowed, false if rate-limited.
 * When Upstash is not configured, all requests are allowed.
 * Uses dynamic imports so @upstash/* never crashes the function if unavailable.
 */
export async function checkRateLimit(
  req: VercelRequest,
  res: VercelResponse
): Promise<boolean> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return true;
  }

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");

    const ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "jfe",
    });

    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      (typeof forwarded === "string" ? forwarded.split(",")[0] : forwarded?.[0]) ??
      "anonymous";

    const { success, limit, remaining, reset } = await ratelimit.limit(ip);

    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", reset);

    if (!success) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return false;
    }

    return true;
  } catch {
    // If rate limiting fails for any reason, allow the request through
    return true;
  }
}
