import type { ProductCardData } from '@/features/catalogue';
import { assertNever } from '@/lib/result';

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
 *
 * ## Two people arrive, and only one of them is the customer
 *
 * The garment image is the catalogue photograph, and every catalogue photograph
 * is the garment WORN — by a store model, face, pose, room and all. Called only
 * "a garment", the model was handed two people and kept the wrong one: asked to
 * dress a chest-up customer in a waistcoat suit, it returned the catalogue shot
 * almost unchanged — the store model's face, his full-length pose, his room.
 * So the prompt says what the second image is, and that nothing but the
 * clothing may be taken from it.
 *
 * It is also an EDIT of the customer's photograph rather than a new picture.
 * The earlier "plain background" requirement asked the model to rebuild the
 * whole scene, which is where the person was being redrawn from scratch; and a
 * cropped photograph was being extended into a full-length one the customer
 * never took. Keeping the frame keeps the person.
 */

/**
 * The standing instruction, independent of which garment is being tried on.
 *
 * Written as a list rather than a paragraph because instruction-following is
 * measurably better against discrete requirements than against prose, and
 * because a reviewer can then object to one line without rewriting the whole.
 */
const INSTRUCTION = [
  'You are editing a photograph for a virtual try-on at an online menswear store.',
  '',
  'The FIRST image is a photograph of a customer. The SECOND image is a garment sold by the store, photographed on a store model.',
  '',
  'Edit the FIRST image so that the customer is wearing that garment. It must stay the same photograph: the same person, pose, camera angle, crop and background.',
  '',
  'Requirements:',
  '- Keep the face, hair, skin tone, body shape and build exactly as they are. The person must remain recognisably themselves.',
  '- Take ONLY the garment from the second image. The store model is not the customer: never copy their face, hair, body, pose, background or framing.',
  '- Keep the framing of the first image. Do not zoom out, extend the frame, or invent any part of the body the first image does not show.',
  '- Reproduce the colour, fabric texture, pattern and styling of the garment faithfully from the second image. Light it to match the first image, but keep its colour true to the second.',
  '- Do not slim, reshape, lengthen or otherwise alter the body.',
  '- Do not add text, watermarks, logos, borders or blurred margins.',
  '- Render the garment as it naturally drapes. Do NOT exaggerate a tight or a loose fit: this image represents colour and appearance only, never tailoring or sizing.',
  '',
  'Return only the edited image.',
].join('\n');

/**
 * What the prompt needs to know about the garment — all of it from the catalogue
 * projection, never from anything a browser sent: it is interpolated into an
 * instruction, and a caller-supplied string there is a prompt-injection surface
 * (SEC-02).
 */
export type TryOnGarment = Pick<
  ProductCardData,
  'name' | 'colourName' | 'fabricName' | 'type' | 'pieceCount'
>;

/**
 * How much of the photograph the garment replaces, read from the DECLARED type
 * (DATA-13a).
 *
 * A waistcoat is sold as a three-piece suit, and its catalogue photograph shows
 * all three pieces; told only "Plain Waistcoat", the model could not know the
 * kameez and shalwar beneath were the product too. A kurta is one piece, and the
 * trousers it was photographed with are styling the customer is not buying.
 *
 * "Outer layers included" is there because it was needed: told only to keep the
 * rest of the customer's clothing, the model slid a kurta UNDER the waistcoat
 * the customer had on, and the product showed as two sleeves.
 */
function coverageOf(garment: TryOnGarment): string {
  switch (garment.type) {
    case 'SET':
      return `It is a set of ${String(garment.pieceCount)} pieces: dress the customer in every piece of the outfit the store model wears. Footwear and accessories are not part of it.`;
    case 'SIMPLE':
      return "It is a single piece: it replaces whatever the customer wears where it sits, outer layers included, so that all of it is visible. Keep the rest of the customer's own clothing.";
    default:
      return assertNever(garment.type);
  }
}

/**
 * The instruction for one garment.
 *
 * The garment is named as well as shown. The picture settles colour and cut;
 * the name settles what the thing IS — "Embroidered Kurta" tells the model it
 * is looking at a long tunic rather than a shirt, which the crop of a product
 * photograph does not always make obvious. Colour and fabric are named too,
 * because a name alone is shared by every colourway of that garment.
 */
export function tryOnPromptFor(garment: TryOnGarment): string {
  const named = `${garment.colourName} ${garment.fabricName} ${garment.name}`;
  return `${INSTRUCTION}\n\nThe garment is: ${named}. ${coverageOf(garment)}`;
}

/** Exported for the test that pins the requirements the prompt must keep. */
export const TRY_ON_INSTRUCTION = INSTRUCTION;
