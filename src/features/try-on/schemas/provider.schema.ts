import { z } from 'zod';

/**
 * §24 — the image model's wire shape, and the module's own image type.
 *
 * DATA-02 applies to an external provider exactly as it does to our own
 * backend: this is untrusted input. A change at the far end must surface as a
 * handled failure rather than as `undefined` reaching an `<img>`, and a
 * provider that starts answering with something else must fail LOUDLY here
 * rather than quietly one layer later.
 */

/**
 * Bytes plus what they are, as they move inside the module.
 *
 * Not on the wire and deliberately not a data URL: a data URL is a third
 * larger, and the only place one is wanted is the very last step, where the
 * contract carries the picture to the browser.
 */
export interface ImagePayload {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
}

/**
 * Why a render did not produce an image. Three, and they are different
 * questions for the customer: not switched on, tried and failed, took too long.
 */
export type RenderFailure = 'PROVIDER_DISABLED' | 'PROVIDER_FAILED' | 'TIMEOUT';

/**
 * The response, parsed loosely on purpose.
 *
 * `parts` is an open list because a model may return commentary alongside the
 * picture, and a text part sitting beside an image part is not a contract
 * violation — it is the ordinary shape of the answer. What matters is whether
 * an inline image is anywhere among them.
 *
 * A well-formed response carrying NO image is not a schema failure either: it
 * is the ordinary shape of a refusal, where a safety filter answers with text
 * or with nothing. The module reports that as the render having failed, which
 * is true, rather than as the contract having broken, which is not.
 */
export const providerResponseSchema = z.object({
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

export type ProviderResponse = z.infer<typeof providerResponseSchema>;

/** The first inline image in a parsed response, or `null` when it carries none. */
export function firstImagePart(payload: ProviderResponse): ImagePayload | null {
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
