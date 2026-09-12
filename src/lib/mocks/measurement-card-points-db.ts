import { KAMEEZ_POINTS, SHALWAR_POINTS, type PointRow } from './measurement-points-db';

/**
 * D1 — the TAILOR'S CARD path's points (plan Phase 4, A2-10), standing in for
 * Java: a card is copied, not measured, so its points follow the CARD's
 * conventions, and each has its own id — a card chest written as a half is not
 * the garment chest, and a style switch or a path switch must never carry one
 * figure into the other.
 *
 * FIXTURE, every convention here, until real cards arrive (plan questions 1 and
 * 3): the client's own example — chest 19.5, ghera 20.5, teera 8.5, cuff 8.5 — is
 * read as a chest and hem HALVED, a teera that is HALF the shoulder, and a cuff and
 * neck written the whole way round.
 */

/* Declared above the rows, which fill it as they are built. */
const garmentOf = new Map<string, string>();

/*
 * A card row is its garment row — the same bounds on the stored figure, the same
 * place on the drawing — with only what the card writes differently changed, so a
 * retuned bound or a redrawn flat is edited once. A card asks for what it holds:
 * no finishing choice's condition ever decides it.
 */
function fromGarment(
  garmentId: string,
  card: Partial<PointRow> & { readonly id: string },
): PointRow {
  const garment = [...KAMEEZ_POINTS, ...SHALWAR_POINTS].find((row) => row.id === garmentId);
  if (garment === undefined) throw new Error(`No garment row ${garmentId} to build a card row from.`);
  garmentOf.set(card.id, garmentId);
  return { ...garment, askedWhen: null, ...card };
}

/**
 * Which GARMENT point each card point was copied from — what a RULE row names
 * (`profile-rule-eval.ts`), so a rule is written once and holds on both paths.
 *
 * It is backend-only and deliberately not a field on the row: `served()` spreads
 * every point field onto the wire, so a column here would ship the tailor's rules
 * to the browser. A card-only point with no garment twin is simply named by its
 * own id in the rule row.
 */
export const GARMENT_POINT_OF: ReadonlyMap<string, string> = garmentOf;

export const KAMEEZ_CARD_POINTS: readonly PointRow[] = [
  fromGarment('kameezLength', { id: 'kameezCardLength' }),
  fromGarment('kameezSleeve', { id: 'kameezCardSleeve' }),
  // HALF the shoulder — the client's "teera 8.5" is a 17 in shoulder — drawn on
  // the half that is written down, seam to centre back.
  fromGarment('kameezShoulder', {
    id: 'kameezCardTeera',
    enteredAs: 'HALF',
    geometry: { shape: 'SPAN', x1: 62, y1: 44, x2: 100, y2: 44 },
  }),
  fromGarment('kameezNeck', { id: 'kameezCardNeck' }),
  fromGarment('kameezChest', { id: 'kameezCardChest' }),
  fromGarment('kameezBottom', { id: 'kameezCardGhera' }),
  // The whole way round — the client's "cuff 8.5" as a half would be a 17 in cuff.
  fromGarment('kameezCuff', { id: 'kameezCardCuff', enteredAs: 'FULL' }),
];

export const SHALWAR_CARD_POINTS: readonly PointRow[] = [
  fromGarment('shalwarLength', { id: 'shalwarCardLength' }),
  fromGarment('shalwarPaincha', { id: 'shalwarCardPoncha' }),
];
