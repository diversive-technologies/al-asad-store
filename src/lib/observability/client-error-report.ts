import { z } from 'zod';

/**
 * F-08 — what the browser's error boundaries may tell the server, and how much of
 * it is believed.
 *
 * The endpoint is public and unauthenticated, so everything in the body is
 * untrusted input (SEC-02): it is parsed against this schema, bounded, and
 * stripped of everything but a short message, a digest and a pathname before it
 * goes anywhere. It is never rendered.
 */

/** The body must fit in 2 kB; a real report is a few hundred bytes. */
export const CLIENT_ERROR_MAX_BYTES = 2048;

/** At most this many reports per client address per minute; the rest are dropped. */
export const CLIENT_ERROR_LIMIT_PER_MINUTE = 5;

export const clientErrorSchema = z.object({
  message: z.string().max(500),
  digest: z.string().max(64).nullable().optional(),
  path: z.string().max(200),
});

export interface ClientErrorReport {
  readonly message: string;
  readonly digest: string | null;
  /** A pathname only — never a query or fragment, which can hold a reset token or a mobile. */
  readonly path: string;
}

/** The pathname of whatever the browser called its page, or `(unknown)` when it is not one. */
export function pathnameOf(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0] ?? '';
  return pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '(unknown)';
}

/**
 * The report a request body amounts to, or `null` when it is not one: too big,
 * not JSON, or the wrong shape. A refused body is dropped, never partly believed.
 */
export function parseClientError(body: string): ClientErrorReport | null {
  if (body.length === 0 || new TextEncoder().encode(body).length > CLIENT_ERROR_MAX_BYTES) {
    return null;
  }

  // ERR-05(1): JSON.parse signals malformed input only by throwing.
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return null;
  }

  const parsed = clientErrorSchema.safeParse(json);
  if (!parsed.success) return null;

  return {
    message: parsed.data.message,
    digest: parsed.data.digest ?? null,
    path: pathnameOf(parsed.data.path),
  };
}

/**
 * A fixed-window counter per key, in this process's memory.
 *
 * Enough for what it guards — keeping one visitor's broken page from turning into
 * a flood of events and a bill — and no more: each serverless instance counts for
 * itself, so the real ceiling is the limit times the instances, and a cold start
 * forgets. The map is bounded so a spread of addresses cannot grow it for ever.
 */
export class WindowLimiter {
  private readonly windows = new Map<string, { startedAt: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 5000,
  ) {}

  /** True when this call is within the limit (and is counted); false when it is over. */
  allow(key: string, now: number): boolean {
    const current = this.windows.get(key);

    if (current === undefined || now - current.startedAt >= this.windowMs) {
      if (this.windows.size >= this.maxKeys) this.prune(now);
      // Still full after pruning: refuse rather than grow without bound.
      if (this.windows.size >= this.maxKeys) return false;
      this.windows.set(key, { startedAt: now, count: 1 });
      return true;
    }

    if (current.count >= this.limit) return false;
    current.count += 1;
    return true;
  }

  private prune(now: number): void {
    for (const [key, window] of this.windows) {
      if (now - window.startedAt >= this.windowMs) this.windows.delete(key);
    }
  }
}
