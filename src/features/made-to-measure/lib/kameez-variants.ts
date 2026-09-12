/**
 * The kameez's parts that follow its finishing choices — the neck and the sleeve
 * ends — as strokes in the kameez drawing's own viewBox (200 × 260), so every
 * variant stays inside the drawing its marks were checked against.
 *
 * The names are the ones a served choice's value carries (`drawingVariant`). A
 * name nobody drew is ignored, and with no names the default is drawn — a narrow
 * ban with round ends and a single cuff, the kameez the studio has always shown —
 * so whatever the content says, the garment is whole (§34.6).
 *
 * FIXTURE, like the choices themselves: narrow and wide, round and square, single
 * and double are drawn as the words suggest until the client says what their
 * tailor sews (plan question 5).
 *
 * Pure: no React, no DOM (PD-02).
 */

export const KAMEEZ_VARIANTS = [
  'COLLAR',
  'BAN_WIDE',
  'BAN_SQUARE',
  'CUFF_DOUBLE',
  'SLEEVE_PLAIN',
] as const;

export type KameezVariant = (typeof KAMEEZ_VARIANTS)[number];

type Variants = ReadonlySet<string>;

/* The one way a name is looked up, so a misspelt name is a compile error rather
   than a silently drawn default. */
const names = (variants: Variants, variant: KameezVariant): boolean => variants.has(variant);

/*
 * A ban opens at the centre front, so it is drawn as TWO halves meeting there. One
 * continuous arc over a dipped neckline closes into a lens and reads as a ring
 * resting on the shoulders rather than as a collar. Round ends rise into the
 * opening in a curve; square ends meet it in a corner. A wide ban stands 4 units
 * taller.
 */
const BAN: Readonly<Record<'NARROW' | 'WIDE', Readonly<Record<'ROUND' | 'SQUARE', readonly string[]>>>> = {
  NARROW: {
    ROUND: [
      'M84,29 L85,21 C90,18 96,17 100,17 L100,31',
      'M116,29 L115,21 C110,18 104,17 100,17 L100,31',
    ],
    SQUARE: ['M84,29 L85,21 L100,20 L100,31', 'M116,29 L115,21 L100,20 L100,31'],
  },
  WIDE: {
    ROUND: [
      'M84,29 L85,17 C90,14 96,13 100,13 L100,31',
      'M116,29 L115,17 C110,14 104,13 100,13 L100,31',
    ],
    SQUARE: ['M84,29 L85,17 L100,16 L100,31', 'M116,29 L115,17 L100,16 L100,31'],
  },
};

/* A shirt collar: a low stand, with the two collar points folded down over the
   neckline onto the top of the placket. */
const COLLAR: readonly string[] = [
  'M84,29 L85,22 C90,20 96,19 100,19 L100,31',
  'M116,29 L115,22 C110,20 104,19 100,19 L100,31',
  'M85,22 L81,34 L95,37 L100,26',
  'M115,22 L119,34 L105,37 L100,26',
];

/* The sleeve ends, each line parallel to the cuff's own edge rather than
   horizontal. A double cuff is a deeper band, folded; a plain sleeve has only its
   turned hem. */
const SINGLE_CUFF: readonly string[] = ['M33,136 L50,146', 'M167,136 L150,146'];
const DOUBLE_CUFF: readonly string[] = [
  'M35.5,128 L51.5,137.4',
  'M33,136 L50,146',
  'M164.5,128 L148.5,137.4',
  'M167,136 L150,146',
];
const PLAIN_HEM: readonly string[] = ['M31.5,143 L48.5,153', 'M168.5,143 L151.5,153'];

function neck(variants: Variants): readonly string[] {
  if (names(variants, 'COLLAR')) return COLLAR;
  return BAN[names(variants, 'BAN_WIDE') ? 'WIDE' : 'NARROW'][
    names(variants, 'BAN_SQUARE') ? 'SQUARE' : 'ROUND'
  ];
}

function sleeveEnds(variants: Variants): readonly string[] {
  if (names(variants, 'SLEEVE_PLAIN')) return PLAIN_HEM;
  return names(variants, 'CUFF_DOUBLE') ? DOUBLE_CUFF : SINGLE_CUFF;
}

/** The kameez's varied strokes, given the variants its choices name. */
export function kameezVaried(variants: Variants): readonly string[] {
  return [...neck(variants), ...sleeveEnds(variants)];
}
