import { z } from 'zod';

/**
 * TS-12 — THE identifier registry.
 *
 * A `productId`, `pieceId` and `orderId` are all `string` to the compiler, so
 * nothing stops one being passed where another is required — and that bug
 * produces a plausible-looking request that fails only against real data.
 * Branding is erased at runtime and makes the transposition a compile error.
 */
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type ProductId = Brand<string, 'ProductId'>;
export type PieceId = Brand<string, 'PieceId'>;
export type SizeId = Brand<string, 'SizeId'>;
export type ColourId = Brand<string, 'ColourId'>;
export type FabricId = Brand<string, 'FabricId'>;
export type CartId = Brand<string, 'CartId'>;
export type CartLineId = Brand<string, 'CartLineId'>;
export type OrderId = Brand<string, 'OrderId'>;

/**
 * Branding happens once, at the validated boundary — never by casting at a call
 * site. The `as` below is the sanctioned TS-03(2) case: narrowing a value a
 * schema has just validated.
 */
export const productIdSchema = z.uuid().transform((value) => value as ProductId);
export const pieceIdSchema = z.uuid().transform((value) => value as PieceId);
export const sizeIdSchema = z.uuid().transform((value) => value as SizeId);
export const colourIdSchema = z.uuid().transform((value) => value as ColourId);
export const fabricIdSchema = z.uuid().transform((value) => value as FabricId);
export const cartIdSchema = z.uuid().transform((value) => value as CartId);
export const cartLineIdSchema = z.uuid().transform((value) => value as CartLineId);
export const orderIdSchema = z.uuid().transform((value) => value as OrderId);
