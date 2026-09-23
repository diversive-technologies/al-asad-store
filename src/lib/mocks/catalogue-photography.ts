import type { ColourKey, WorkKey } from './catalogue-vocabulary';
import type { GarmentKey } from './garment-kinds';

/**
 * The client's own photography, in `public/products/` — split out of
 * `catalogue-db.ts` (MOD-03).
 *
 * Every attribute a customer can SEE in the picture is read from this table
 * rather than computed from the product index — colour, which garment it is,
 * and, where the picture settles it, the work on the cloth. That is the whole
 * point: a generated fixture is free to call a product "Slate", but if the
 * photograph shows a maroon waistcoat then the card is lying, and no amount of
 * filter correctness makes a lying card acceptable.
 *
 * Attributes the picture does NOT settle — fabric, price, launch date, and the
 * work type of the older photographs — stay generated, so filtering and sorting
 * still have something to vary.
 */
export interface Photograph {
  readonly file: string;
  readonly colour: ColourKey;
  readonly garment: GarmentKey;
  /**
   * How many frames exist for this garment, including the original.
   *
   * Additional frames arrive as `<file>-2.avif`, `-3` and so on — the same
   * garment at a different distance or angle — and adding them is bumping this
   * number, not editing a component. `frameUrls` below is the only place the
   * naming lives.
   */
  readonly frames?: number;
  /**
   * Which frame (1-based) the product RESTS on — the card's still and the
   * gallery's first picture. The rest follow in order and wrap.
   *
   * It exists because some garments were shot as colourways of one setup —
   * the same model in the same pose — and leading both on frame 1 put two
   * near-identical tiles in the grid. Leading one on a different view keeps
   * every tile distinct without inventing a picture.
   */
  readonly lead?: number;
  /** The work on the cloth, where the photograph shows it plainly. */
  readonly work?: WorkKey;
  /**
   * Whether this garment is sold as CLOTH or as a finished piece, when that is
   * not what its kind would imply.
   *
   * A kurta is otherwise taken to be an unstitched length, which is how the
   * client sells most of them. It is declared here rather than derived because
   * the two are different products — a length has metreage and no sizes, a
   * finished kurta has sizes and no metreage — and a table of photographs is
   * the honest place to say which one the picture shows.
   *
   * It is also load-bearing for the fixture: a one-piece garment sold BY SIZE
   * is the SIMPLE-with-sizes case, which several suites need and which nothing
   * else in the catalogue provides. It used to be supplied by the boys' kurtas
   * alone, and went with them when they were withdrawn.
   */
  readonly sold?: 'unstitched' | 'stitched';
}

/**
 * Five frames per garment for the first fourteen: the client's own photograph,
 * plus four generated views of the SAME garment — full length, three-quarter,
 * side profile and a collar detail — cropped from one 2x2 collage each.
 *
 * The next ten are generated too, from the operator's 1x4 collages (kept in
 * `assets/photography/collages/`): six garments with four views each, and one
 * collage of four different garments that gives each of them a single frame.
 * They are consistent with themselves, but they are not a photo shoot. Real
 * photographs replace them file-for-file.
 */
const FRAMES = 5;
const VIEWS = 4;

/**
 * One product per photograph, in the order the catalogue lists them (the first
 * is the newest). The order is chosen, not incidental: garments from the same
 * shoot — the same model in the same room — sit apart, so no two neighbouring
 * tiles read as one picture twice.
 *
 * The unstitched line is the olive kurta (a one-piece length) and the taupe
 * kameez (a two-piece suit length) — the two ways cloth is actually sold here.
 * The rust kurta is `sold: 'stitched'` instead: finished, and by size. It is
 * the only SIMPLE-with-sizes product in the catalogue and several suites need
 * one, and the unstitched pair keeps "You may also like" able to answer on an
 * unstitched page, which one length alone could not.
 *
 * EVERY attribute a product is not photographed with is derived from its INDEX
 * here (`catalogue-db.ts`): its id, code, slug, cloth, price, discount,
 * metreage, launch date and whether it is in stock. Removing or reordering a
 * row therefore renumbers everything after it, which is why the list is edited
 * rarely and never casually.
 *
 * Four rows were withdrawn on 2026-09-23 at the operator's request: the two
 * boys' kurtas, because the storefront is not to show a child model, and the
 * maroon and emerald waistcoats, which were the only two shot on a saturated
 * blue studio backdrop among otherwise warm interiors. The boys' garment KIND
 * went with them rather than being left with no products.
 */
export const PHOTOGRAPHY: readonly Photograph[] = [
  { file: 'waistcoat-camel', colour: 'camel', garment: 'waistcoat', frames: VIEWS, work: 'plain' },
  { file: 'kurta-olive', colour: 'olive', garment: 'kurta', work: 'embroidered' },
  { file: 'kameez-slate', colour: 'slate', garment: 'kameez', frames: FRAMES },
  { file: 'waistcoat-black', colour: 'black', garment: 'waistcoat', frames: VIEWS, work: 'plain' },
  { file: 'kurta-rust', colour: 'rust', garment: 'kurta', frames: FRAMES, sold: 'stitched' },
  { file: 'waistcoat-bottle', colour: 'bottle', garment: 'waistcoat', frames: FRAMES, lead: 3 },
  {
    file: 'kameez-ash',
    colour: 'ash',
    garment: 'kameez',
    frames: VIEWS,
    lead: 4,
    work: 'embroidered',
  },
  {
    file: 'waistcoat-chocolate',
    colour: 'chocolate',
    garment: 'waistcoat',
    frames: VIEWS,
    work: 'plain',
  },
  { file: 'kameez-taupe', colour: 'taupe', garment: 'kameez', frames: FRAMES, sold: 'unstitched' },
  { file: 'waistcoat-gold', colour: 'gold', garment: 'waistcoat', work: 'embroidered' },
  { file: 'kameez-charcoal', colour: 'charcoal', garment: 'kameez', frames: FRAMES },
  { file: 'waistcoat-walnut', colour: 'walnut', garment: 'waistcoat', frames: FRAMES, lead: 2 },
  { file: 'kameez-royal', colour: 'royal', garment: 'kameez', work: 'embroidered' },
  { file: 'kameez-rust', colour: 'rust', garment: 'kameez', frames: VIEWS, work: 'self-textured' },
  { file: 'waistcoat-olive', colour: 'olive', garment: 'waistcoat', frames: FRAMES },
  { file: 'waistcoat-stone', colour: 'stone', garment: 'waistcoat', frames: FRAMES },
  { file: 'waistcoat-navy', colour: 'navy', garment: 'waistcoat', frames: VIEWS, work: 'plain' },
  { file: 'waistcoat-charcoal', colour: 'charcoal', garment: 'waistcoat', work: 'contrast-trim' },
  { file: 'waistcoat-graphite', colour: 'graphite', garment: 'waistcoat', frames: FRAMES },
  { file: 'waistcoat-ivory', colour: 'ivory', garment: 'waistcoat', frames: FRAMES },
];

export function photoUrl(file: string): string {
  return `/products/${file}.avif`;
}

/**
 * Every frame for a garment, the lead frame first.
 *
 * The card rests on `[0]`, advances through the rest on hover, and its
 * previous/next controls walk the same list.
 */
export function frameUrls(photo: Photograph): string[] {
  const total = photo.frames ?? 1;
  const lead = Math.min(Math.max((photo.lead ?? 1) - 1, 0), total - 1);

  return Array.from({ length: total }, (_, offset) => {
    const index = (lead + offset) % total;
    return photoUrl(index === 0 ? photo.file : `${photo.file}-${String(index + 1)}`);
  });
}
