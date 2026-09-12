/**
 * What a `/stitched` address asks for.
 *
 * Total, never throwing: a missing, repeated or malformed `?style=` or `?source=`
 * is simply no request, and the page falls back — to the first style the workshop
 * offers, and to that style's first way of measuring. A value that is well-formed
 * but not offered is decided against what the backend serves, by the loader.
 *
 * MOD-04 — pure.
 */

import { garmentStyleIdSchema, type GarmentStyleId } from '@/lib/domain/ids';

import { captureSourceSchema, type CaptureSource } from '../schemas/measurement-set.schema';

export function requestedStyle(value: string | string[] | undefined): GarmentStyleId | null {
  if (typeof value !== 'string') return null;
  const parsed = garmentStyleIdSchema.safeParse(value.trim());
  return parsed.success ? parsed.data : null;
}

export function requestedSource(value: string | string[] | undefined): CaptureSource | null {
  if (typeof value !== 'string') return null;
  const parsed = captureSourceSchema.safeParse(value.trim());
  return parsed.success ? parsed.data : null;
}
