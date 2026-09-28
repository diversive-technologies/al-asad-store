/**
 * §24 — how far the white-balance correction may move a colour channel.
 *
 * The correction is grey-world: over a whole photograph the channel means should
 * be roughly equal, so the gains that equalise them undo the cast of the light it
 * was taken under. That assumption cannot tell a warm LIGHT from a warm SCENE. A
 * customer in a rust kurta against a brick wall averages to orange with no cast
 * at all, and full correction cuts red by 30% and lifts blue by 64% — measured on
 * the store's own rust kurta photograph — which turns the face grey-blue before
 * the model has seen it. The model then keeps that face, because keeping the face
 * is the first thing it is told to do.
 *
 * So each gain is bounded. A real tungsten or fluorescent cast is still pulled
 * most of the way back; a photograph that is simply full of one colour is nudged
 * rather than repainted. What is left of a cast is the prompt's to handle: it
 * tells the model to keep the garment's colour true to the catalogue photograph.
 *
 * Pure: channel means in, gains out. The image work is `try-on-images.ts`.
 */

/** The furthest one channel is moved, either way, as a multiplier. */
export const MAX_CHANNEL_GAIN = 1.15;

/** A photograph's mean value per channel, as sharp's `stats()` reports it. */
export interface ChannelMeans {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

/** One multiplier per channel, in red, green, blue order — what `linear` takes. */
export type ChannelGains = readonly [red: number, green: number, blue: number];

function bounded(gain: number): number {
  return Math.min(MAX_CHANNEL_GAIN, Math.max(1 / MAX_CHANNEL_GAIN, gain));
}

/** The gains that move each channel toward the photograph's grey, within bounds. */
export function whiteBalanceGains({ red, green, blue }: ChannelMeans): ChannelGains {
  const grey = (red + green + blue) / 3;
  // A fully black channel has no cast to correct and would divide by zero.
  const gain = (mean: number): number => (mean <= 0 ? 1 : bounded(grey / mean));

  return [gain(red), gain(green), gain(blue)];
}
