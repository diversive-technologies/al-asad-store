/**
 * D1 — whether a save RECORDS anything the current version does not (§34.7),
 * standing in for Java.
 *
 * A save used to mint a new version every time, even of figures already on file.
 * That was harmless while nothing named a version, and wrong the moment a bag line
 * did: a customer who reused their saved kameez figures for a second kameez,
 * checked them and saved, superseded the version the first bag line named — and
 * placement then refused that line, correctly, for measurements "saved again".
 * Every way of adding a garment goes through a save, so two garments of one style
 * could never be ordered together.
 *
 * So a save that records exactly what is current IS the current version. Nothing
 * is lost to D6 by answering with it: no record is overwritten, and the version on
 * file already holds every figure this save would have held.
 *
 * "Exactly" is what the workshop is sent, not what the page showed. The recorded
 * millimetres, how each was read (half or full, garment or body, typed or copied),
 * the finishing choices, the list and rule set they were judged against, and what
 * the customer chose to keep — all of it. What is NOT compared is the typed text
 * and its unit: "21 in" and "53.3 cm" that record the same millimetre are the same
 * measurement, and the tape does not care which way round the customer typed it.
 */

interface RecordedValue {
  readonly pointId: string;
  readonly valueMm: number;
  readonly enteredAs: string;
  readonly basis: string;
  readonly origin: string;
}

export interface RecordedProfile {
  readonly setVersion: number;
  readonly ruleSetVersion: number;
  readonly source: string;
  readonly preferences: readonly { readonly group: string; readonly value: string }[];
  readonly values: readonly RecordedValue[];
  readonly acknowledgedFindings: readonly object[];
}

/* Order-free: a list is a set of facts here, and two saves listing the same
   points in a different order record the same measurements. */
const canonical = (items: readonly object[]): string =>
  JSON.stringify(items.map((item) => JSON.stringify(item)).sort());

const recordedValues = (profile: RecordedProfile): string =>
  canonical(
    profile.values.map(({ pointId, valueMm, enteredAs, basis, origin }) => ({
      pointId,
      valueMm,
      enteredAs,
      basis,
      origin,
    })),
  );

export function recordsSameAs(current: RecordedProfile, next: RecordedProfile): boolean {
  return (
    current.setVersion === next.setVersion &&
    current.ruleSetVersion === next.ruleSetVersion &&
    current.source === next.source &&
    canonical(current.preferences) === canonical(next.preferences) &&
    recordedValues(current) === recordedValues(next) &&
    canonical(current.acknowledgedFindings) === canonical(next.acknowledgedFindings)
  );
}
