import { z } from 'zod';

import { serverEnv } from '@/config/env.server';
import { err, ok, type Result } from '@/lib/result';

/**
 * Architecture §24's `TryOnProvider` port, and the one adapter behind it.
 *
 * ## Why this file is in the mock layer and not in `app/api`
 *
 * §24 puts the provider behind a port owned by the JAVA module. Calling the
 * image service from a Next Route Handler would look equivalent and would not
 * be: it would put the storefront on the provider's critical path, give the
 * browser a credential-bearing surface the real architecture does not have, and
 * teach the interface a shape the Java service will never serve. CLAUDE.md's D1
 * names exactly this trap — a mock that does the backend's work in the wrong
 * layer teaches a habit the real backend cannot support.
 *
 * So the seam sits here, where module 14 will sit. When Java takes over, this
 * file and `try-on-db.ts` are deleted together and NOTHING above them changes:
 * not the contract, not the BFF, not one line of the interface.
 *
 * ## The port
 *
 * `render(correctedPhoto, productImage) -> Image` is §24's port signature. A
 * second adapter — the client's own vendor, a self-hosted model — implements
 * this interface and is selected by configuration. That is what "switching the
 * real service on is configuration, not a release" means.
 */

/** Raw image bytes with the type they are encoded in. Never a path or a URL. */
export interface ImagePayload {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
}

export interface RenderRequest {
  /** The customer's photograph, already white-balanced by the service. */
  readonly correctedPhoto: ImagePayload;
  /** The garment's own photograph, from the catalogue. */
  readonly productImage: ImagePayload;
  /** What the garment is, in words, so the model has more than pixels. */
  readonly garmentDescription: string;
}

export type RenderFailure = 'PROVIDER_DISABLED' | 'PROVIDER_FAILED' | 'TIMEOUT';

export interface TryOnProvider {
  /** §24 `isAvailable()` — whether a provider is configured at all. */
  isConfigured: () => boolean;
  render: (
    request: RenderRequest,
    signal: AbortSignal,
  ) => Promise<Result<ImagePayload, RenderFailure>>;
}

const PROVIDER_ORIGIN = 'https://generativelanguage.googleapis.com';

/**
 * The instruction, and the one line in this file the operator decided.
 *
 * The final requirement is not decoration. A generated image CANNOT honestly
 * represent fit — nothing in a photograph tells the model whether this customer
 * takes a small or a large, so an image that rendered a garment as tight or as
 * loose would be inventing a fact, and it would be read as a sizing promise.
 * The try-on answers "what does this look like on me"; the size guide answers
 * "which size am I". The model is told in as many words not to blur the two.
 *
 * It is also why nothing upstream sends a size — see `try-on.schema.ts`.
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
 * DATA-02 applies to an external provider exactly as it does to our own
 * backend: this is untrusted wire shape, and a change at the far end must
 * surface as a handled failure rather than as `undefined` reaching an `<img>`.
 *
 * Parts are loose on purpose — a model may return commentary alongside the
 * picture, and a text part sitting beside the image is not a contract violation.
 */
const providerResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z.array(
              z.object({
                inlineData: z
                  .object({ mimeType: z.string().min(1), data: z.string().min(1) })
                  .optional(),
              }),
            ),
          })
          .optional(),
      }),
    )
    .min(1),
});

function firstImagePart(payload: z.infer<typeof providerResponseSchema>): ImagePayload | null {
  for (const candidate of payload.candidates) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData === undefined) continue;

      return {
        bytes: Buffer.from(part.inlineData.data, 'base64'),
        mimeType: part.inlineData.mimeType,
      };
    }
  }

  return null;
}

/**
 * The adapter. It holds the credential, speaks the vendor's dialect, and
 * converts everything — transport failure, refusal, a well-formed response with
 * no picture in it — into the three failures the port declares.
 */
export const imageModelProvider: TryOnProvider = {
  isConfigured: () => serverEnv.TRY_ON_PROVIDER_API_KEY !== undefined,

  async render(request, signal) {
    const apiKey = serverEnv.TRY_ON_PROVIDER_API_KEY;
    if (apiKey === undefined) return err('PROVIDER_DISABLED');

    const url = `${PROVIDER_ORIGIN}/v1beta/models/${serverEnv.TRY_ON_PROVIDER_MODEL}:generateContent`;

    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${INSTRUCTION}\n\nThe garment is: ${request.garmentDescription}.` },
            {
              inlineData: {
                mimeType: request.correctedPhoto.mimeType,
                data: Buffer.from(request.correctedPhoto.bytes).toString('base64'),
              },
            },
            {
              inlineData: {
                mimeType: request.productImage.mimeType,
                data: Buffer.from(request.productImage.bytes).toString('base64'),
              },
            },
          ],
        },
      ],
      generationConfig: { responseModalities: ['IMAGE'] },
    };

    /*
     * ERR-05(1): fetch signals transport failure — and abort — only by
     * rejecting. Converted to a value here, never propagated as a throw.
     */
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal,
    }).then<Response | null, null>(
      (result) => result,
      () => null,
    );

    if (response === null) return err(signal.aborted ? 'TIMEOUT' : 'PROVIDER_FAILED');
    if (!response.ok) return err('PROVIDER_FAILED');

    const payload: unknown = await response.json().then<unknown, null>(
      (value: unknown) => value,
      () => null,
    );

    const parsed = providerResponseSchema.safeParse(payload);
    if (!parsed.success) return err('PROVIDER_FAILED');

    const image = firstImagePart(parsed.data);

    /*
     * A well-formed response carrying no picture is the ordinary shape of a
     * refusal — a safety filter answers with text, or with nothing at all. That
     * is a failure of this request rather than of the contract, so it does not
     * masquerade as one.
     */
    return image === null ? err('PROVIDER_FAILED') : ok(image);
  },
};
