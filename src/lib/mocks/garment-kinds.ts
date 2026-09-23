/**
 * D1 — the garment kinds the fixture catalogue is built from.
 *
 * A leaf of its own so that two mocks can be keyed by it without importing each
 * other: the catalogue builds its records from these kinds, and the table of
 * which kinds the workshop cuts (`stitching-offers.ts`) is read BY the catalogue.
 * Typed as a closed union so that adding a kind here is a compile error in the
 * two tables keyed by it — `PIECES` in the catalogue and `STITCHING_STYLE` —
 * until each says what to do with it. The piece NAMES and the vocabulary labels
 * are keyed by plain strings and still fall back quietly; a new kind needs them
 * too, and nothing here makes the compiler say so.
 */
export type GarmentKey = 'waistcoat' | 'kameez' | 'kurta';
