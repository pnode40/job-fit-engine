import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: true,
    prefix: "jfe",
  });
}

/**
 * Returns true if the request is allowed, false if rate-limited.
 * When Upstash is not configured (dev), all requests are allowed.
 */
export async function checkRateLimit(
  req: VercelRequest,
  res: VercelResponse
): Promise<boolean> {
  if (!ratelimit) return true;

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
}
