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

/**
 * How long the frontend waits for a try-on image, in milliseconds.
 *
 * The global `JAVA_API_TIMEOUT_MS` is 10s, which is right for every other call
 * and far too short for this one: configuration register 23 gives the Try-On
 * module itself 30 seconds to answer.
 *
 * This number is deliberately ABOVE that, and the margin is load-bearing. If the
 * client gave up first it would abort the request and produce a generic
 * transport failure, throwing away the typed `UNAVAILABLE / TIMEOUT` the module
 * was about to return — the customer would be told the store could not be
 * reached when in fact the try-on service simply took too long. Waiting slightly
 * longer than the backend's own limit is what lets the backend's answer win.
 *
 * It is NOT a copy of register 23. That value belongs to the Try-On module and
 * lives with it; this is the frontend's own budget for calling it (DATA-13).
 */
export const TRY_ON_REQUEST_TIMEOUT_MS = 35_000;
