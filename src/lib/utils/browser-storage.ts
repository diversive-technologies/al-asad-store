/**
 * `localStorage`, for a browser that may refuse to have any.
 *
 * Reading `localStorage` is not a safe property access. With site data blocked —
 * Chrome's "block third-party and site cookies", some private modes, an embedded
 * view with storage switched off — the GETTER itself throws a `SecurityError`, and
 * `setItem` throws a `QuotaExceededError` once storage is full. An unguarded read
 * in an effect that runs on every page takes the whole page to its error boundary
 * for a visitor who did nothing but decline to be remembered.
 *
 * ERR-05(1): the Web Storage API signals "unavailable" only by throwing, so this
 * module is the one place that adapts it, and nothing escapes it. Storage that
 * cannot be used behaves as storage holding nothing: a read answers `null`, and a
 * write or a removal simply does not happen. Everything this store keeps in the
 * browser is a convenience, so that is always the right degradation.
 *
 * Read through `globalThis` rather than `window`, so the server render and a test
 * process — where neither exists — take the same "unavailable" branch.
 */

/** The stored string, or `null` when there is none or storage cannot be read. */
export function readStorage(key: string): string | null {
  // ERR-05(1): the getter or `getItem` throws when site data is blocked.
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Answers whether the value was stored; a browser refusing storage keeps nothing. */
export function writeStorage(key: string, value: string): boolean {
  // ERR-05(1): blocked storage throws on access, full storage throws on write.
  try {
    globalThis.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Removes the entry where storage can be reached; otherwise there is nothing to remove. */
export function removeStorage(key: string): void {
  // ERR-05(1): the getter throws when site data is blocked.
  try {
    globalThis.localStorage.removeItem(key);
  } catch {
    return;
  }
}
