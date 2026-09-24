/**
 * §24 Try-On — the instruction the image model is given, and the reasoning it
 * encodes. This is the module's most load-bearing prose, so it is a file of its
 * own rather than a string buried in an adapter: changing how the try-on
 * behaves is editing THIS, and it can be read, reviewed and tested on its own.
 *
 * Pure. No environment, no I/O, no vendor types — the adapter decides how to
 * carry these words, and a different provider would carry the same ones.
 *
 * ## The four things the prompt must achieve, and why each line is there
 *
 * **1. It must stay the same person.** The feature answers "what does this look
 * like on ME". A model left to itself will drift toward the face it finds most
 * probable, and a customer shown a stranger in their own clothes will not trust
 * anything else on the page. Identity is therefore stated first and in terms of
 * the specific attributes that drift: face, hair, skin tone, build.
 *
 * **2. It must not flatter.** Slimming, straightening or lengthening is the
 * default behaviour of image models trained on retouched fashion photography,
 * and it is the single most harmful thing this feature could do — it would
 * return a garment worn by a body the customer does not have, which is both a
 * lie and, on a page with a size guide beside it, a sizing lie.
 *
 * **3. It must reproduce the GARMENT faithfully.** Colour is what this market
 * buys on. The white-balance correction upstream exists for the same reason;
 * the prompt finishes the job by naming colour, texture and pattern explicitly
 * rather than trusting "wearing that garment" to carry them.
 *
 * **4. It must not imply fit.** Nothing in a photograph tells the model whether
 * this customer takes a small or a large. An image rendered tight or loose
 * would be inventing a fact, and beside an "Add to bag" button it would be read
 * as a sizing promise. The try-on answers what it looks like; the size guide
 * answers which size. The model is told in as many words not to blur the two —
 * and it is why nothing upstream sends a size at all (`try-on.schema.ts`).
 */

/**
 * The standing instruction, independent of which garment is being tried on.
 *
 * Written as a list rather than a paragraph because instruction-following is
 * measurably better against discrete requirements than against prose, and
 * because a reviewer can then object to one line without rewriting the whole.
 */
const INSTRUCTION = [
  'You are producing a virtual try-on image for an online menswear store.',
  '',
  'The FIRST image is a photograph of a customer. The SECOND image is a garment sold by the store.',
  '',
  'Produce a single photograph of the SAME person from the first image, wearing that garment.',
  '',
  'Requirements:',
  '- Keep the face, hair, skin tone, body shape and build exactly as they are. The person must remain recognisably themselves.',
  '- Reproduce the colour, fabric texture, pattern and styling of the garment faithfully from the second image.',
  '- Keep the pose and the framing close to the original photograph.',
  '- Use even, neutral lighting and a plain, uncluttered background.',
  '- Do not slim, reshape, lengthen or otherwise alter the body.',
  '- Do not add text, watermarks, logos or borders.',
  '- Render the garment as it naturally drapes. Do NOT exaggerate a tight or a loose fit: this image represents colour and appearance only, never tailoring or sizing.',
  '',
  'Return only the image.',
].join('\n');

/**
 * The instruction for one garment.
 *
 * The garment is named as well as shown. The picture settles colour and cut;
 * the name settles what the thing IS — "Embroidered Kurta" tells the model it
 * is looking at a long tunic rather than a shirt, which the crop of a product
 * photograph does not always make obvious.
 *
 * The description arrives from the catalogue projection, never from anything a
 * browser sent: it is interpolated into an instruction, and a caller-supplied
 * string there is a prompt-injection surface (SEC-02).
 */
export function tryOnPromptFor(garmentDescription: string): string {
  const named = garmentDescription.trim();
  return named.length === 0 ? INSTRUCTION : `${INSTRUCTION}\n\nThe garment is: ${named}.`;
}

/** Exported for the test that pins the requirements the prompt must keep. */
export const TRY_ON_INSTRUCTION = INSTRUCTION;
