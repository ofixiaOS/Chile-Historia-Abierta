export interface RateLimitDecision {
  readonly allowed: boolean
  readonly retryAfterSeconds: number
}

interface Bucket {
  startedAt: number
  count: number
}

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>()
  private lastSweepAt = Number.NEGATIVE_INFINITY

  constructor(
    private readonly maxKeys = 10_000,
    private readonly now: () => number = Date.now
  ) {}

  consume(key: string, limit: number, windowMs: number): RateLimitDecision {
    const now = this.now()
    const bucket = this.buckets.get(key)

    if (bucket && now - bucket.startedAt < windowMs) {
      if (bucket.count >= limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - bucket.startedAt)) / 1000)),
        }
      }
      bucket.count += 1
      return { allowed: true, retryAfterSeconds: 0 }
    }

    if (this.buckets.size >= this.maxKeys) {
      if (now - this.lastSweepAt >= 1_000) {
        this.lastSweepAt = now
        for (const [bucketKey, candidate] of this.buckets) {
          if (now - candidate.startedAt >= windowMs) this.buckets.delete(bucketKey)
        }
      }
      if (this.buckets.size >= this.maxKeys) {
        return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1000) }
      }
    }

    this.buckets.set(key, { startedAt: now, count: 1 })
    return { allowed: true, retryAfterSeconds: 0 }
  }
}
