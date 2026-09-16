/**
 * D1 — WHO a measurement profile belongs to, standing in for module 18's half
 * of §34.5's ownership.
 *
 * Split from `profiles-db.ts`, which was over MOD-03's ceiling and was two
 * things by its own header's admission — "the store, and who may write to it".
 * This is the second half: minting a guest's token, recognising one, and reading
 * the owner off the header the BFF attached.
 *
 * An owner has a KIND as well as a key, and the kind is part of the identity.
 * Keying by the key alone once made `DEVICE:someone@example.com` the same owner
 * as `ACCOUNT:someone@example.com`, which let a forged cookie supersede an
 * account's profiles — the defect this separation must not undo.
 */

export interface ProfileOwnerRow {
  keptWith: 'ACCOUNT' | 'DEVICE';
  key: string;
}

const DEVICE_TOKENS = new Set<string>();

/** The one spelling of an owner's identity, used as the store's key. */
export const ownerKeyOf = (owner: ProfileOwnerRow): string => `${owner.keptWith}:${owner.key}`;

/** A guest's device token, minted here as a cart id is minted by the cart module. */
export function issueDeviceToken(): string {
  const token = crypto.randomUUID();
  DEVICE_TOKENS.add(token);
  return token;
}

/** A device owner counts only with a token this module issued. */
export function isKnownOwner(owner: ProfileOwnerRow): boolean {
  return owner.keptWith === 'ACCOUNT' || DEVICE_TOKENS.has(owner.key);
}

/** The owner the BFF attached (`API_HEADERS.measurementOwner`), or null. */
export function profileOwnerOf(header: string | null): ProfileOwnerRow | null {
  if (header === null) return null;
  const at = header.indexOf(':');
  if (at < 1) return null;
  const kind = header.slice(0, at);
  const key = header.slice(at + 1);
  if (key.length === 0) return null;
  return kind === 'ACCOUNT' || kind === 'DEVICE' ? { keptWith: kind, key } : null;
}
