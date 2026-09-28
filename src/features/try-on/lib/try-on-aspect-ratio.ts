/**
 * §24 — the shape the try-on is generated in.
 *
 * Left to itself, the image model picks an output shape from its inputs, and
 * there are two: the customer's photograph and the garment's. A try-on is an
 * edit of the customer's photograph, so it is asked for in THAT photograph's
 * shape. When the model composes into a shape its source does not fill, it
 * fills the gap itself — which is where blurred margins down the sides come
 * from, and part of how a chest-up photograph came back full-length.
 *
 * The model produces a fixed set of shapes, so the nearest one is chosen.
 *
 * Pure: a width and a height in, a ratio out.
 */

/** The output shapes the image model can produce, as width:height. */
export const TRY_ON_ASPECT_RATIOS = [
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
  '21:9',
] as const;

export type TryOnAspectRatio = (typeof TRY_ON_ASPECT_RATIOS)[number];

function valueOf(ratio: TryOnAspectRatio): number {
  const [width = 1, height = 1] = ratio.split(':').map(Number);
  return width / height;
}

/**
 * The supported shape nearest to a photograph's.
 *
 * Compared on a log scale, so a photograph twice as tall as it is wide is as
 * far from square as one twice as wide as it is tall.
 */
export function aspectRatioFor(widthPx: number, heightPx: number): TryOnAspectRatio {
  const target = Math.log(widthPx / heightPx);
  const distance = (ratio: TryOnAspectRatio): number => Math.abs(Math.log(valueOf(ratio)) - target);

  return TRY_ON_ASPECT_RATIOS.reduce((best, ratio) =>
    distance(ratio) < distance(best) ? ratio : best,
  );
}
