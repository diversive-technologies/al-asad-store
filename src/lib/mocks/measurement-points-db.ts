/**
 * D1 — the measurement POINTS module 18 serves, as rows. The lists that group
 * them into styles are `measurement-sets-db.ts`; the words are Localisation's,
 * in `measurement-copy-db.ts`.
 *
 * FIXTURE, and labelled so. The ORDER is the client's — Length, Sleeves,
 * Shoulder (Teera), Neck, Chest, Hem (Ghera), Shalwar, Poncha — with everything
 * they did not list after it. Every bound, the required flags on the points they
 * did not list and the half-or-full conventions are OURS, plausible rather than
 * authoritative, until their written list arrives. They are GARMENT figures, and
 * ADULT ones: a kameez chest carries ease that a body chest does not.
 *
 * Half or full follows what a garment on a table makes physically true: a chest,
 * a hem, a cuff and a poncha are folded in half by the garment and measured
 * across; a shoulder seam to seam, a neck on its opened band and every length are
 * read whole.
 */

import type { ConditionRow } from './measurement-options-db';

type GeometryRow =
  | { shape: 'RING'; cx: number; cy: number; rx: number; ry: number; rotate?: number }
  | { shape: 'SPAN'; x1: number; y1: number; x2: number; y2: number };

export interface PointRow {
  id: string;
  pieceId: string;
  kind: 'GIRTH' | 'LENGTH' | 'WIDTH';
  enteredAs: 'HALF' | 'FULL';
  basis: 'GARMENT' | 'BODY';
  termKey: string | null;
  required: boolean;
  minMm: number;
  maxMm: number;
  geometry: GeometryRow | null;
  /** Absent for a point always asked; served as null (`measurementSetFor`). */
  askedWhen?: ConditionRow | null;
}

export const KAMEEZ_POINTS: readonly PointRow[] = [
  {
    id: 'kameezLength',
    pieceId: 'KAMEEZ',
    kind: 'LENGTH',
    enteredAs: 'FULL',
    basis: 'GARMENT',
    termKey: null,
    required: true,
    minMm: 900,
    maxMm: 1300,
    // Down the front on the far side of the placket from the chest ring, so the
    // two markers do not overlap into one 36px hit area on a phone.
    geometry: { shape: 'SPAN', x1: 122, y1: 31, x2: 122, y2: 242 },
  },
  {
    id: 'kameezSleeve',
    pieceId: 'KAMEEZ',
    kind: 'LENGTH',
    enteredAs: 'FULL',
    basis: 'GARMENT',
    termKey: null,
    required: true,
    minMm: 450,
    maxMm: 750,
    // Outside the sleeve and PARALLEL to it, the way a pattern sheet marks a
    // length that runs along an edge.
    geometry: { shape: 'SPAN', x1: 147, y1: 34, x2: 179, y2: 145 },
  },
  {
    id: 'kameezShoulder',
    pieceId: 'KAMEEZ',
    kind: 'WIDTH',
    enteredAs: 'FULL',
    basis: 'GARMENT',
    termKey: 'TEERA',
    required: true,
    minMm: 350,
    /* Wide enough that the widest chest this list accepts still has a shoulder
       the rules can be satisfied with: a ceiling below 0.436 × 1500 − 25 would
       leave a customer re-measuring against a note no accepted figure can clear. */
    maxMm: 640,
    // Seam to seam across the back — the whole span is on the table already.
    geometry: { shape: 'SPAN', x1: 62, y1: 44, x2: 138, y2: 44 },
  },
  {
    id: 'kameezNeck',
    pieceId: 'KAMEEZ',
    kind: 'GIRTH',
    enteredAs: 'FULL',
    basis: 'GARMENT',
    termKey: null,
    required: true,
    minMm: 330,
    // Likewise wide enough to clear the neck rule at the widest chest accepted.
    maxMm: 545,
    // No mark. On the front view the fastened band is 32 units against a
    // 76-unit shoulder, so any line across it pictures HALF a neck and teaches
    // the customer to type about 7.5. The mark comes with a drawing of the band
    // laid open; until then the instruction carries it.
    geometry: null,
  },
  {
    id: 'kameezChest',
    pieceId: 'KAMEEZ',
    kind: 'GIRTH',
    enteredAs: 'HALF',
    basis: 'GARMENT',
    termKey: null,
    required: true,
    minMm: 800,
    maxMm: 1500,
    // An inch below the underarm, which the outline puts at y=76.
    geometry: { shape: 'RING', cx: 100, cy: 90, rx: 37, ry: 9 },
  },
  {
    id: 'kameezBottom',
    pieceId: 'KAMEEZ',
    kind: 'GIRTH',
    enteredAs: 'HALF',
    basis: 'GARMENT',
    termKey: 'GHERA',
    required: true,
    minMm: 900,
    // Below twice the minimum, so a full ghera typed into the across field is
    // refused rather than recorded twice its size.
    maxMm: 1790,
    geometry: { shape: 'RING', cx: 100, cy: 239, rx: 47, ry: 10 },
  },
  {
    id: 'kameezCuff',
    pieceId: 'KAMEEZ',
    kind: 'GIRTH',
    enteredAs: 'HALF',
    basis: 'GARMENT',
    termKey: null,
    required: false,
    // 7 to 12 in around. Wider than that admitted a slim wrist's full figure
    // typed into the across field.
    minMm: 180,
    maxMm: 305,
    // Only a sleeve with a cuff has one to measure.
    askedWhen: { group: 'sleeveFinish', values: ['CUFF'] },
    geometry: { shape: 'RING', cx: 161, cy: 153, rx: 11, ry: 4, rotate: -30 },
  },
  {
    /* A plain sleeve's opening, asked INSTEAD of the cuff — provisional in the
       plan until the client says whether a plain sleeve is offered and measured
       (question 5). 11 to 18 in around, and under twice its minimum like every
       half. It marks the same place as the cuff: the two are never asked
       together, so only one is ever on the drawing. */
    id: 'kameezMohri',
    pieceId: 'KAMEEZ',
    kind: 'GIRTH',
    enteredAs: 'HALF',
    basis: 'GARMENT',
    termKey: 'MOHRI',
    required: false,
    minMm: 280,
    maxMm: 460,
    askedWhen: { group: 'sleeveFinish', values: ['PLAIN'] },
    geometry: { shape: 'RING', cx: 161, cy: 153, rx: 11, ry: 4, rotate: -30 },
  },
];

export const SHALWAR_POINTS: readonly PointRow[] = [
  {
    id: 'shalwarLength',
    pieceId: 'SHALWAR',
    kind: 'LENGTH',
    enteredAs: 'FULL',
    basis: 'GARMENT',
    termKey: null,
    required: true,
    minMm: 900,
    maxMm: 1200,
    geometry: { shape: 'SPAN', x1: 12, y1: 20, x2: 12, y2: 246 },
  },
  {
    id: 'shalwarPaincha',
    pieceId: 'SHALWAR',
    kind: 'GIRTH',
    enteredAs: 'HALF',
    basis: 'GARMENT',
    termKey: 'PONCHA',
    required: true,
    // 13 in around is about the smallest closed opening an adult foot passes
    // through, so nothing narrower is a shalwar anyone could put on. It also keeps
    // the maximum under twice the minimum, so a full figure typed across is refused.
    minMm: 330,
    maxMm: 450,
    geometry: { shape: 'RING', cx: 36, cy: 240, rx: 17, ry: 6 },
  },
  {
    id: 'shalwarWaist',
    pieceId: 'SHALWAR',
    kind: 'GIRTH',
    enteredAs: 'HALF',
    basis: 'GARMENT',
    termKey: null,
    required: false,
    // The one KNOWN OVERLAP. On a nala shalwar the nefa itself gathers on the
    // cord, so the figure is the nefa loosened and spread flat — and 650–1800 mm
    // cannot tell a gathered reading from a spread one. The client's cards say
    // which construction they sew, and whether a waist is taken at all.
    minMm: 650,
    maxMm: 1800,
    geometry: { shape: 'RING', cx: 100, cy: 29, rx: 82, ry: 9 },
  },
  {
    id: 'shalwarThigh',
    pieceId: 'SHALWAR',
    kind: 'GIRTH',
    enteredAs: 'HALF',
    basis: 'GARMENT',
    termKey: null,
    required: false,
    minMm: 500,
    maxMm: 900,
    geometry: { shape: 'RING', cx: 52, cy: 125, rx: 33, ry: 9 },
  },
];

/* Required — OUR decision, not the client's: in a waistcoat suit the waistcoat is
   a garment being cut, and nobody can cut one without its chest, shoulder and
   length. The plan asks the client to confirm. */
export const WAISTCOAT_POINTS: readonly PointRow[] = [
  {
    id: 'waistcoatShoulder',
    pieceId: 'WAISTCOAT',
    kind: 'WIDTH',
    enteredAs: 'FULL',
    basis: 'GARMENT',
    termKey: null,
    required: true,
    minMm: 350,
    maxMm: 600,
    geometry: { shape: 'SPAN', x1: 58, y1: 32, x2: 142, y2: 32 },
  },
  {
    id: 'waistcoatChest',
    pieceId: 'WAISTCOAT',
    kind: 'GIRTH',
    enteredAs: 'HALF',
    basis: 'GARMENT',
    termKey: null,
    required: true,
    minMm: 800,
    // A waistcoat goes OVER the kameez, so it must be able to reach the widest
    // kameez chest this list accepts.
    maxMm: 1500,
    geometry: { shape: 'RING', cx: 100, cy: 94, rx: 53, ry: 10 },
  },
  {
    id: 'waistcoatLength',
    pieceId: 'WAISTCOAT',
    kind: 'LENGTH',
    enteredAs: 'FULL',
    basis: 'GARMENT',
    termKey: null,
    required: true,
    minMm: 550,
    maxMm: 850,
    geometry: { shape: 'SPAN', x1: 74, y1: 27, x2: 74, y2: 166 },
  },
];
