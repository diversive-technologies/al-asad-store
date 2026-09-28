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

/** A prepared photograph with the size it was prepared at — its shape is asked for. */
export interface SizedImagePayload extends ImagePayload {
  readonly widthPx: number;
  readonly heightPx: number;
}

/**
 * Why a render did not produce an image. Three, and they are different
 * questions for the customer: not switched on, tried and failed, took too long.
 */
export type RenderFailure = 'PROVIDER_DISABLED' | 'PROVIDER_FAILED' | 'TIMEOUT';

/**
 * A failed render: the reason the customer is told, and the detail an operator
 * needs. The two are different on purpose. "Could not create the image" is all
 * a customer should read (ERR-11); "HTTP 403 PERMISSION_DENIED" against
 * "finishReason IMAGE_SAFETY" is the difference between a key to fix and a
 * photograph the model refused, and without it every failure on a deployment
 * looked the same and logged nothing.
 *
 * SEC-10: `detail` carries status codes and the provider's enum values only —
 * never a message body, which could echo the request.
 */
export interface ProviderFailure {
  readonly reason: RenderFailure;
  readonly detail: string;
}

/**
 * The response, parsed loosely on purpose.
 *
 * `parts` is an open list because a model may return commentary alongside the
 * picture, and a text part sitting beside an image part is not a contract
 * violation — it is the ordinary shape of the answer. What matters is whether
 * an inline image is anywhere among them. A part marked `thought` is a draft a
 * thinking model made on the way to its answer, not the answer.
 *
 * A well-formed response carrying NO image is not a schema failure either: it
 * is the ordinary shape of a refusal, where a safety filter answers with text,
 * with a `finishReason`, or — when the request itself is blocked — with no
 * candidates at all and a `promptFeedback.blockReason`. Candidates are optional
 * so that last case parses, and says why, instead of failing as a broken
 * contract.
 */
export const providerResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z
              .array(
                z.object({
                  inlineData: z
                    .object({ mimeType: z.string().min(1), data: z.string().min(1) })
                    .optional(),
                  thought: z.boolean().optional(),
                }),
              )
              .optional(),
          })
          .optional(),
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
});

export type ProviderResponse = z.infer<typeof providerResponseSchema>;

/** The body of a refused request — only the enum-valued status is read. */
export const providerErrorSchema = z.object({
  error: z.object({ status: z.string().min(1) }),
});

/** The first finished inline image in a parsed response, or `null` when it carries none. */
export function firstImagePart(payload: ProviderResponse): ImagePayload | null {
  for (const candidate of payload.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData === undefined || part.thought === true) continue;

      return {
        bytes: Buffer.from(part.inlineData.data, 'base64'),
        mimeType: part.inlineData.mimeType,
      };
    }
  }

  return null;
}

/** Why a well-formed response carried no image, in the provider's own words. */
export function missingImageDetail(payload: ProviderResponse): string {
  const blocked = payload.promptFeedback?.blockReason;
  if (blocked !== undefined) return `request blocked: ${blocked}`;

  const finish = payload.candidates?.[0]?.finishReason;
  return finish === undefined ? 'no image in the response' : `no image, finishReason ${finish}`;
}
