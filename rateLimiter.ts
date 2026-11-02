import { redis } from '../config/redis';

export type RateLimitCheck = {
  allowed: boolean;
  retryInMs: number;
  currentCount: number;
};

function getHourBucket(now: Date): string {
  const copy = new Date(now);
  copy.setMinutes(0, 0, 0);
  return copy.toISOString();
}

function sanitizeSender(sender: string): string {
  return sender.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export async function checkRateLimit(sender: string, hourlyLimit: number): Promise<RateLimitCheck> {
  const now = new Date();
  const hourBucket = getHourBucket(now);
  const key = `rate-limit:${sanitizeSender(sender)}:${hourBucket}`;

  const currentCount = await redis.incr(key);
  if (currentCount === 1) {
    await redis.expire(key, 60 * 60);
  }

  if (currentCount <= hourlyLimit) {
    return {
      allowed: true,
      retryInMs: 0,
      currentCount,
    };
  }

  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

  return {
    allowed: false,
    retryInMs: Math.max(0, nextHour.getTime() - now.getTime()),
    currentCount,
  };
}
