import { z } from 'zod';

import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/locales';
import { addressDetailSchema } from '@/lib/domain/address';

import type { PlaceInput } from './checkout-db';

/**
 * D1 — the request BODIES the stand-in for Java is sent, read as `unknown` and
 * parsed before anything touches them (SEC-02, TS-03). Java's boundary refuses a
 * body of the wrong shape with a 400, and so does this, rather than casting it
 * and defaulting whatever is missing.
 *
 * The mock cannot import a feature's own request schema (MOD-01: `lib/` never
 * imports `features/`), so it states the wire shape for itself, exactly as
 * `profile-submission.ts` does for module 18. The feature-side schema tests run
 * each feature's parsed request through these, so the two cannot drift apart
 * unnoticed. Business rules — whether a product exists, whether a size is
 * offered — are the stores' to answer, not the shape's.
 */

const text = z.string();
const id = z.string().min(1);

/** §16 `addItem(cart, product_id, {piece_id -> size}, qty)`. */
export const addItemBody = z.object({
  productId: id,
  selections: z.array(z.object({ pieceId: id, sizeId: id })),
  quantity: z.number().int().positive(),
  madeToMeasureProfileId: id.optional(),
});

/** §16 `updateQuantity(cart, line, qty)`. */
export const quantityBody = z.object({ quantity: z.number().int().positive() });

/** §16 `applyCode(cart, code)`. */
export const codeBody = z.object({ code: text });

/** §17 `place(...)`. */
export const placeBody: z.ZodType<PlaceInput> = z.object({
  contactName: text,
  contactMobile: text,
  contactEmail: text,
  addressLine: text,
  addressCity: text,
  deliveryOptionId: text,
  paymentMethodId: text,
  isGift: z.boolean(),
  giftMessage: text,
  expectedTotalMinor: z.number().int().nonnegative(),
});

/** §28.3's guest lookup "by number and mobile". */
export const orderLookupBody = z.object({ mobile: text });

/** §11 `authenticate(email, password)`. */
export const authenticateBody = z.object({ email: text, password: text });

/** §11 `issueCode(mobile)`. */
export const issueCodeBody = z.object({ mobile: text });

/** §11 `authenticateByCode(mobile, code)`. */
export const codeSignInBody = z.object({ mobile: text, code: text });

/** Registration. */
export const registerBody = z.object({ fullName: text, email: text, mobile: text, password: text });

/** §11 `resetPassword(email)`. */
export const resetBody = z.object({ email: text });

/** §28.3's saved items — bounded, because a stand-in for Java trusts no caller. */
export const savedItemsBody = z.object({ productIds: z.array(id).max(100) });

/** A saved address, or the next version of one when the body names its id. */
export const addressWriteBody = z.object({
  address: addressDetailSchema,
  addressId: id.optional(),
});

/** An address the caller already holds: to remove, or to make the default. */
export const addressChoiceBody = z.object({ addressId: id });

/** §28.3's saved sizes — one size, to save or to forget. Which SET it belongs to is the store's to know. */
export const savedSizeBody = z.object({ sizeId: id });

/**
 * §28.2's Notify Me. The address is bounded and checked here exactly as the
 * contract states it — 254 characters, trimmed — because a stand-in for Java
 * trusts no caller, and the feature's schema test holds the two together.
 */
export const backInStockBody = z.object({
  productId: id,
  pieceId: id.nullable(),
  sizeId: id,
  email: z.string().trim().max(254).pipe(z.email()).nullable(),
});

/**
 * The same body with the address left unchecked — its SHAPE alone. A body of the
 * wrong shape is Java's 400; a well-shaped body whose address it will not write
 * to is its 422, the refusal the storefront puts back on the address field.
 */
export const backInStockShape = backInStockBody.extend({ email: text.nullable() });

/**
 * A body parsed against its shape, or `null` for Java's 400. Read from a CLONE:
 * MSW walks its handler list, and a resolver that consumes the stream leaves the
 * next handler holding "Body is unusable".
 */
export async function bodyOf<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<z.infer<TSchema> | null> {
  const raw = await request
    .clone()
    .json()
    .then<unknown, null>(
      (value: unknown) => value,
      () => null,
    );
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * A header the BFF attached, or `null` when it attached none. An EMPTY value is
 * none as well: a header present with nothing in it names nobody, and treating
 * it as a key would put every such request under one shared owner.
 */
export function headerOf(request: Request, name: string): string | null {
  const value = request.headers.get(name);
  return value === null || value.length === 0 ? null : value;
}

/** The locale a localised read asked for, as a query param; the default otherwise. */
export function localeOf(request: Request): Locale {
  const requested = new URL(request.url).searchParams.get('locale');
  return isLocale(requested) ? requested : DEFAULT_LOCALE;
}
