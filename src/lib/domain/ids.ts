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

export type GarmentStyleId = Brand<string, 'GarmentStyleId'>;
export type MeasurementPieceId = Brand<string, 'MeasurementPieceId'>;
export type MeasurementPointId = Brand<string, 'MeasurementPointId'>;

/*
 * Made-to-Measure identifiers are CODES the tailor's card and the workshop read —
 * KAMEEZ_SHALWAR, kameezChest — not UUIDs, so they are checked for shape: a
 * letter first, then letters, digits or underscores. That shape is also what
 * makes one safe in a URL and as a form field name without escaping.
 */
export const MEASUREMENT_CODE = /^[A-Za-z][A-Za-z0-9_]*$/;

export const garmentStyleIdSchema = z
  .string()
  .regex(MEASUREMENT_CODE)
  .transform((value) => value as GarmentStyleId);
export const measurementPieceIdSchema = z
  .string()
  .regex(MEASUREMENT_CODE)
  .transform((value) => value as MeasurementPieceId);
export const measurementPointIdSchema = z
  .string()
  .regex(MEASUREMENT_CODE)
  .transform((value) => value as MeasurementPointId);

/* A finishing choice and its values (§34.5 `options[]`, A2-7) are codes of the
   same shape: a choice's id becomes a radio group's name. */
export type OptionGroupId = Brand<string, 'OptionGroupId'>;
export type OptionValueId = Brand<string, 'OptionValueId'>;

export const optionGroupIdSchema = z
  .string()
  .regex(MEASUREMENT_CODE)
  .transform((value) => value as OptionGroupId);
export const optionValueIdSchema = z
  .string()
  .regex(MEASUREMENT_CODE)
  .transform((value) => value as OptionValueId);

/* A tailor's rule is named the same way, so a customer's kept figure can be
   recorded against it by name (A2-8) and stay resolvable after the rule changes. */
export type RuleId = Brand<string, 'RuleId'>;
export const ruleIdSchema = z
  .string()
  .regex(MEASUREMENT_CODE)
  .max(64)
  .transform((value) => value as RuleId);

export type ProfileId = Brand<string, 'ProfileId'>;
export const profileIdSchema = z.uuid().transform((value) => value as ProfileId);
