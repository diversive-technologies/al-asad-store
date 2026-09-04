/**
 * Cross-cutting literals that are the SAME for every client (SSOT-00).
 *
 * Anything that differs between clients lives in `client.ts` instead. Currency
 * moved there because it is a client's choice, and its minor-unit divisor moved
 * WITH it rather than staying here — 100 is a property of PKR, not of money. A
 * deployment selling in JPY divides by 1, and holding the two apart is how that
 * becomes a silent factor-of-100 pricing bug.
 */

/** Cache lifetime for catalogue-shaped reads, in seconds (DATA-09). */
export const CATALOGUE_REVALIDATE_SECONDS = 300;
