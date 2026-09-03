/**
 * Cross-cutting literals (SSOT-00).
 *
 * DATA-11a: this system serves ONE market in ONE currency from ONE warehouse.
 * `CURRENCY` is a fixed constant, never a user selection and never a column on a
 * price. A currency selector would model a market structure that does not exist.
 */
export const CURRENCY = 'PKR' as const;

/** DATA-11: money crosses the wire and is computed in minor units (paisa). */
export const MINOR_UNITS_PER_MAJOR = 100;

/** Cache lifetime for catalogue-shaped reads, in seconds (DATA-09). */
export const CATALOGUE_REVALIDATE_SECONDS = 300;
