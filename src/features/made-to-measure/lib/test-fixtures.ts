/**
 * Test fixtures — module 18's served lists, Localisation's wording for them and
 * the style offers, as the backend puts them on the wire (§34.5, §34.3, A2-4).
 * Read through `test-support.ts`, which parses them through the real contracts;
 * nothing in the studio may import this file.
 *
 * A SNAPSHOT, not a stand-in: nothing here answers a request, keeps a profile or
 * judges a figure — that is the backend's (§34.4), and is tested there. Every
 * bound, convention and word is FIXTURE on the backend too, until the client's
 * written list arrives; these rows are copied from what it serves, and typed
 * against the contract's INPUT, so a change to the wire shape fails to compile
 * here before it fails a test.
 *
 * Two styles are enough for what the tests ask: the kameez shalwar on both paths,
 * and the waistcoat suit that adds a third garment to the same kameez and shalwar.
 * The wording is English only — every test reads it in English, the Urdu pages'
 * included, since their labels come from this read and not from a message file.
 */

import type { z } from 'zod';

import type { styleOfferSchema } from '@/lib/domain/style-offer';

import type { measurementCopySchema } from '../schemas/measurement-copy.schema';
import type {
  measurementPointSchema,
  measurementSetSchema,
  optionGroupSchema,
  setPieceSchema,
} from '../schemas/measurement-set.schema';

type PointRow = z.input<typeof measurementPointSchema>;
/* Never empty, and typed so, as the contract's lists are: spread together they
   still make a list with a first point. */
type PointRows = readonly [PointRow, ...PointRow[]];
type PieceRow = z.input<typeof setPieceSchema>;
type OptionGroupRow = z.input<typeof optionGroupSchema>;
type SetRow = z.input<typeof measurementSetSchema>;

/* The kameez in the client's order — Length, Sleeves, Shoulder (Teera), Neck,
   Chest, Hem (Ghera) — then what they did not list. A chest, a hem and a cuff are
   folded in half by the garment and read across; a shoulder seam to seam, a neck
   on its opened band and every length are read whole. */
const KAMEEZ_LENGTH: PointRow = {
  id: 'kameezLength',
  pieceId: 'KAMEEZ',
  kind: 'LENGTH',
  enteredAs: 'FULL',
  basis: 'GARMENT',
  termKey: null,
  required: true,
  minMm: 900,
  maxMm: 1300,
  geometry: { shape: 'SPAN', x1: 122, y1: 31, x2: 122, y2: 242 },
  askedWhen: null,
};

const KAMEEZ_SLEEVE: PointRow = {
  id: 'kameezSleeve',
  pieceId: 'KAMEEZ',
  kind: 'LENGTH',
  enteredAs: 'FULL',
  basis: 'GARMENT',
  termKey: null,
  required: true,
  minMm: 450,
  maxMm: 750,
  geometry: { shape: 'SPAN', x1: 147, y1: 34, x2: 179, y2: 145 },
  askedWhen: null,
};

const KAMEEZ_SHOULDER: PointRow = {
  id: 'kameezShoulder',
  pieceId: 'KAMEEZ',
  kind: 'WIDTH',
  enteredAs: 'FULL',
  basis: 'GARMENT',
  termKey: 'TEERA',
  required: true,
  minMm: 350,
  maxMm: 640,
  geometry: { shape: 'SPAN', x1: 62, y1: 44, x2: 138, y2: 44 },
  askedWhen: null,
};

const KAMEEZ_NECK: PointRow = {
  id: 'kameezNeck',
  pieceId: 'KAMEEZ',
  kind: 'GIRTH',
  enteredAs: 'FULL',
  basis: 'GARMENT',
  termKey: null,
  required: true,
  minMm: 330,
  maxMm: 545,
  // Unmarked: any line across the fastened band would picture HALF a neck.
  geometry: null,
  askedWhen: null,
};

const KAMEEZ_CHEST: PointRow = {
  id: 'kameezChest',
  pieceId: 'KAMEEZ',
  kind: 'GIRTH',
  enteredAs: 'HALF',
  basis: 'GARMENT',
  termKey: null,
  required: true,
  minMm: 800,
  maxMm: 1500,
  geometry: { shape: 'RING', cx: 100, cy: 90, rx: 37, ry: 9 },
  askedWhen: null,
};

const KAMEEZ_BOTTOM: PointRow = {
  id: 'kameezBottom',
  pieceId: 'KAMEEZ',
  kind: 'GIRTH',
  enteredAs: 'HALF',
  basis: 'GARMENT',
  termKey: 'GHERA',
  required: true,
  minMm: 900,
  maxMm: 1790,
  geometry: { shape: 'RING', cx: 100, cy: 239, rx: 47, ry: 10 },
  askedWhen: null,
};

const KAMEEZ_CUFF: PointRow = {
  id: 'kameezCuff',
  pieceId: 'KAMEEZ',
  kind: 'GIRTH',
  enteredAs: 'HALF',
  basis: 'GARMENT',
  termKey: null,
  required: false,
  minMm: 180,
  maxMm: 305,
  geometry: { shape: 'RING', cx: 161, cy: 153, rx: 11, ry: 4, rotate: -30 },
  // Only a sleeve with a cuff has one to measure.
  askedWhen: { group: 'sleeveFinish', values: ['CUFF'] },
};

/* A plain sleeve's opening, asked INSTEAD of the cuff and marked in the same
   place: the two are never asked together. */
const KAMEEZ_MOHRI: PointRow = {
  id: 'kameezMohri',
  pieceId: 'KAMEEZ',
  kind: 'GIRTH',
  enteredAs: 'HALF',
  basis: 'GARMENT',
  termKey: 'MOHRI',
  required: false,
  minMm: 280,
  maxMm: 460,
  geometry: { shape: 'RING', cx: 161, cy: 153, rx: 11, ry: 4, rotate: -30 },
  askedWhen: { group: 'sleeveFinish', values: ['PLAIN'] },
};

const SHALWAR_LENGTH: PointRow = {
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
  askedWhen: null,
};

const SHALWAR_PAINCHA: PointRow = {
  id: 'shalwarPaincha',
  pieceId: 'SHALWAR',
  kind: 'GIRTH',
  enteredAs: 'HALF',
  basis: 'GARMENT',
  termKey: 'PONCHA',
  required: true,
  minMm: 330,
  maxMm: 450,
  geometry: { shape: 'RING', cx: 36, cy: 240, rx: 17, ry: 6 },
  askedWhen: null,
};

const KAMEEZ_POINTS: PointRows = [
  KAMEEZ_LENGTH,
  KAMEEZ_SLEEVE,
  KAMEEZ_SHOULDER,
  KAMEEZ_NECK,
  KAMEEZ_CHEST,
  KAMEEZ_BOTTOM,
  KAMEEZ_CUFF,
  KAMEEZ_MOHRI,
];

const SHALWAR_POINTS: PointRows = [
  SHALWAR_LENGTH,
  SHALWAR_PAINCHA,
  {
    id: 'shalwarWaist',
    pieceId: 'SHALWAR',
    kind: 'GIRTH',
    enteredAs: 'HALF',
    basis: 'GARMENT',
    termKey: null,
    required: false,
    // The one range that reaches twice its minimum: a gathered nefa and a spread
    // one cannot be told apart by bounds alone.
    minMm: 650,
    maxMm: 1800,
    geometry: { shape: 'RING', cx: 100, cy: 29, rx: 82, ry: 9 },
    askedWhen: null,
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
    askedWhen: null,
  },
];

/* In a waistcoat suit the waistcoat is a garment being cut, so nothing of it may
   be left unmeasured. */
const WAISTCOAT_POINTS: PointRows = [
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
    askedWhen: null,
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
    maxMm: 1500,
    geometry: { shape: 'RING', cx: 100, cy: 94, rx: 53, ry: 10 },
    askedWhen: null,
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
    askedWhen: null,
  },
];

/*
 * The tailor's card path (A2-10): each card point is its garment point — the same
 * bounds on the stored figure, the same place on the drawing — under its own id,
 * with only what the card writes differently changed. A card asks for what it
 * holds, so no finishing choice decides any of it. The client's own example —
 * chest 19.5, ghera 20.5, teera 8.5, cuff 8.5 — reads as a chest and hem halved,
 * a teera that is HALF the shoulder, and a cuff written the whole way round.
 */
const KAMEEZ_CARD_POINTS: PointRows = [
  { ...KAMEEZ_LENGTH, id: 'kameezCardLength' },
  { ...KAMEEZ_SLEEVE, id: 'kameezCardSleeve' },
  {
    ...KAMEEZ_SHOULDER,
    id: 'kameezCardTeera',
    enteredAs: 'HALF',
    // Seam to centre back: the half that is written down.
    geometry: { shape: 'SPAN', x1: 62, y1: 44, x2: 100, y2: 44 },
  },
  { ...KAMEEZ_NECK, id: 'kameezCardNeck' },
  { ...KAMEEZ_CHEST, id: 'kameezCardChest' },
  { ...KAMEEZ_BOTTOM, id: 'kameezCardGhera' },
  { ...KAMEEZ_CUFF, id: 'kameezCardCuff', enteredAs: 'FULL', askedWhen: null },
];

const SHALWAR_CARD_POINTS: PointRows = [
  { ...SHALWAR_LENGTH, id: 'shalwarCardLength' },
  { ...SHALWAR_PAINCHA, id: 'shalwarCardPoncha' },
];

/* Every style's kameez is finished the same way. A card list carries the choices
   too: there they describe the kameez to be stitched, and ask for nothing. */
const KAMEEZ_OPTIONS: readonly OptionGroupRow[] = [
  {
    id: 'neckStyle',
    pieceId: 'KAMEEZ',
    defaultValue: 'BAN',
    appliesWhen: null,
    values: [
      { id: 'BAN', drawingVariant: null },
      { id: 'COLLAR', drawingVariant: 'COLLAR' },
    ],
  },
  {
    id: 'banWidth',
    pieceId: 'KAMEEZ',
    defaultValue: 'NARROW',
    appliesWhen: { group: 'neckStyle', values: ['BAN'] },
    values: [
      { id: 'NARROW', drawingVariant: null },
      { id: 'WIDE', drawingVariant: 'BAN_WIDE' },
    ],
  },
  {
    id: 'banShape',
    pieceId: 'KAMEEZ',
    defaultValue: 'ROUND',
    appliesWhen: { group: 'neckStyle', values: ['BAN'] },
    values: [
      { id: 'ROUND', drawingVariant: null },
      { id: 'SQUARE', drawingVariant: 'BAN_SQUARE' },
    ],
  },
  {
    id: 'sleeveFinish',
    pieceId: 'KAMEEZ',
    defaultValue: 'CUFF',
    appliesWhen: null,
    values: [
      { id: 'CUFF', drawingVariant: null },
      { id: 'PLAIN', drawingVariant: 'SLEEVE_PLAIN' },
    ],
  },
  {
    id: 'cuffStyle',
    pieceId: 'KAMEEZ',
    defaultValue: 'SINGLE',
    appliesWhen: { group: 'sleeveFinish', values: ['CUFF'] },
    values: [
      { id: 'SINGLE', drawingVariant: null },
      { id: 'DOUBLE', drawingVariant: 'CUFF_DOUBLE' },
    ],
  },
];

const KAMEEZ: PieceRow = { id: 'KAMEEZ', drawingId: 'KAMEEZ' };
const SHALWAR: PieceRow = { id: 'SHALWAR', drawingId: 'SHALWAR' };
const WAISTCOAT: PieceRow = { id: 'WAISTCOAT', drawingId: 'WAISTCOAT' };

/** Each list as it is served: with every path its style offers, the garment path first. */
export const SERVED_SETS: readonly SetRow[] = [
  {
    garmentStyle: 'KAMEEZ_SHALWAR',
    source: 'GARMENT_COPY',
    sources: ['GARMENT_COPY', 'TAILOR_CARD'],
    version: 1,
    pieces: [KAMEEZ, SHALWAR],
    points: [...KAMEEZ_POINTS, ...SHALWAR_POINTS],
    options: [...KAMEEZ_OPTIONS],
  },
  {
    garmentStyle: 'KAMEEZ_SHALWAR',
    source: 'TAILOR_CARD',
    sources: ['GARMENT_COPY', 'TAILOR_CARD'],
    version: 1,
    pieces: [KAMEEZ, SHALWAR],
    points: [...KAMEEZ_CARD_POINTS, ...SHALWAR_CARD_POINTS],
    options: [...KAMEEZ_OPTIONS],
  },
  // No card path: whether a waistcoat has its own card is still the client's to say.
  {
    garmentStyle: 'WAISTCOAT_SUIT',
    source: 'GARMENT_COPY',
    sources: ['GARMENT_COPY'],
    version: 1,
    pieces: [KAMEEZ, SHALWAR, WAISTCOAT],
    points: [...KAMEEZ_POINTS, ...SHALWAR_POINTS, ...WAISTCOAT_POINTS],
    options: [...KAMEEZ_OPTIONS],
  },
];

/** In the order the studio offers them; the first is what a bare `/stitched` opens. */
export const STYLE_OFFERS: readonly z.input<typeof styleOfferSchema>[] = [
  { garmentStyle: 'KAMEEZ_SHALWAR', leadTimeDays: 7, stitchingChargeMinor: 250000 },
  // A third garment to cut and finish, so it costs more and takes longer.
  { garmentStyle: 'WAISTCOAT_SUIT', leadTimeDays: 10, stitchingChargeMinor: 400000 },
];

/** One read of the wording, in English: every style, garment, point and choice above. */
export const MEASUREMENT_COPY: z.input<typeof measurementCopySchema> = {
  styles: { KAMEEZ_SHALWAR: 'Kameez shalwar', WAISTCOAT_SUIT: 'Waistcoat suit' },
  pieces: { KAMEEZ: 'Kameez', SHALWAR: 'Shalwar', WAISTCOAT: 'Waistcoat' },
  points: {
    kameezLength: {
      label: 'Kameez length',
      instruction: 'From the highest point of the shoulder, straight down to the hem.',
    },
    kameezSleeve: {
      label: 'Sleeve length',
      instruction:
        'From the shoulder seam, along the top of the sleeve, to its end — the cuff included, if it has one.',
    },
    kameezShoulder: {
      label: 'Shoulder',
      instruction:
        'Lay the kameez flat, face up. Measure across the back, from one shoulder seam to the other.',
    },
    kameezNeck: {
      label: 'Neck',
      instruction:
        'Unbutton the band at the neck — the ban, or the stand under a collar — and lay it open. Measure from the centre of the button to the far end of the buttonhole.',
    },
    kameezChest: {
      label: 'Chest',
      instruction:
        'Button the neck again, then measure straight across the chest, an inch below the armhole, with the kameez flat.',
    },
    kameezBottom: {
      label: 'Hem (Ghera)',
      instruction: 'Measure across the hem at its widest, with the kameez lying flat.',
    },
    kameezCuff: {
      label: 'Cuff',
      instruction: 'Measure across the cuff opening with it fastened.',
    },
    kameezMohri: {
      label: 'Sleeve opening (Mohri)',
      instruction: 'With the sleeve lying flat, measure straight across its open end.',
    },
    shalwarLength: {
      label: 'Shalwar length',
      instruction: 'From the top of the waistband, straight down to the hem.',
    },
    shalwarPaincha: {
      label: 'Trouser bottom (Poncha)',
      instruction: 'Measure across the opening at the ankle.',
    },
    shalwarWaist: {
      label: 'Waist',
      instruction:
        'Loosen the nala and spread the waistband out flat so no gathers remain, then measure straight across from edge to edge.',
    },
    shalwarThigh: {
      label: 'Thigh',
      instruction: 'Measure across one leg at its widest, just below the crotch seam.',
    },
    waistcoatShoulder: {
      label: 'Waistcoat shoulder',
      instruction: 'Across the back, from one shoulder seam to the other.',
    },
    waistcoatChest: {
      label: 'Waistcoat chest',
      instruction:
        'Measure across the chest just below the armholes, with the waistcoat fastened and flat.',
    },
    waistcoatLength: {
      label: 'Waistcoat length',
      instruction: 'From the highest point of the shoulder, straight down to the hem.',
    },
    /* A card's instruction says what the STORE does with the figure — never what
       cards "usually" do. */
    kameezCardLength: {
      label: 'Length',
      instruction: 'Type the card’s kameez length as written.',
    },
    kameezCardSleeve: {
      label: 'Sleeve',
      instruction: 'Type the card’s sleeve length as written.',
    },
    kameezCardTeera: {
      label: 'Teera (shoulder)',
      instruction:
        'We read the card’s teera as half the shoulder: 8.5 is kept as 17. Type it as written.',
    },
    kameezCardNeck: {
      label: 'Gala (neck)',
      instruction: 'We read the card’s neck as the whole way round. Type it as written.',
    },
    kameezCardChest: {
      label: 'Chest',
      instruction:
        'We read the card’s chest as half the way round: 19.5 is kept as 39. Type it as written.',
    },
    kameezCardGhera: {
      label: 'Ghera (hem)',
      instruction:
        'We read the card’s ghera as half the way round: 20.5 is kept as 41. Type it as written.',
    },
    kameezCardCuff: {
      label: 'Cuff',
      instruction: 'We read the card’s cuff as the whole way round. Type it as written.',
    },
    shalwarCardLength: {
      label: 'Shalwar length',
      instruction: 'Type the card’s shalwar length as written.',
    },
    shalwarCardPoncha: {
      label: 'Trouser bottom (Poncha)',
      instruction:
        'We read the card’s poncha as half the way round: 7.5 is kept as 15. Type it as written.',
    },
  },
  options: {
    neckStyle: { label: 'Neck style', values: { BAN: 'Ban (band collar)', COLLAR: 'Collar' } },
    banWidth: { label: 'Ban width', values: { NARROW: 'Narrow', WIDE: 'Wide' } },
    banShape: { label: 'Ban ends', values: { ROUND: 'Round', SQUARE: 'Square' } },
    sleeveFinish: { label: 'Sleeve end', values: { CUFF: 'Cuff', PLAIN: 'Plain' } },
    cuffStyle: { label: 'Cuff style', values: { SINGLE: 'Single', DOUBLE: 'Double' } },
  },
};
