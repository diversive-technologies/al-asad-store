import 'server-only';

import { serverEnv } from '@/config/env.server';
import { err, ok, type Result } from '@/lib/result';

import { tryOnPromptFor } from '../lib/try-on-prompt';
import {
  firstImagePart,
  providerResponseSchema,
  type ImagePayload,
  type RenderFailure,
} from '../schemas/provider.schema';

/**
 * §24 — the image model, behind a port.
 *
 * BASE-03 in spirit: the vendor is spoken to in exactly one file. Everything
 * above it — the orchestration, the contract, the dialog, the waiting state —
 * is written against `TryOnProvider` and knows nothing about Google, so
 * swapping the model is replacing this file and nothing else.
 *
 * The adapter holds the credential, speaks the vendor's dialect, and converts
 * EVERYTHING into the three failures the port declares: a transport error, an
 * abort, a refusal, a well-formed response with no picture in it. Nothing
 * throws out of `render`.
 *
 * SEC-01/SEC-10 — the key is read through `serverEnv` and never leaves this
 * process. It is not in the repository, not in a comment, and not in any
 * message the customer can see.
 */

const PROVIDER_ORIGIN = 'https://generativelanguage.googleapis.com';

/** What a render needs: the person, the garment, and what the garment is. */
export interface RenderRequest {
  readonly correctedPhoto: ImagePayload;
  readonly productImage: ImagePayload;
  readonly garmentDescription: string;
}

/**
 * The port. `isConfigured` answers from configuration alone and never calls the
 * provider — asking an external service whether it is up, on every product page
 * render, would put it on that page's critical path to answer a question about
 * our own settings.
 */
export interface TryOnProvider {
  isConfigured: () => boolean;
  render: (request: RenderRequest, signal: AbortSignal) => Promise<Result<ImagePayload, RenderFailure>>;
}

/** The vendor's request dialect: the instruction, then the customer, then the garment. */
function requestBodyFor(request: RenderRequest): unknown {
  const inline = (image: ImagePayload) => ({
    inlineData: { mimeType: image.mimeType, data: Buffer.from(image.bytes).toString('base64') },
  });

  return {
    contents: [
      {
        role: 'user',
        parts: [
          { text: tryOnPromptFor(request.garmentDescription) },
          inline(request.correctedPhoto),
          inline(request.productImage),
        ],
      },
    ],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
}

export const imageModelProvider: TryOnProvider = {
  isConfigured: () => serverEnv.TRY_ON_PROVIDER_API_KEY !== undefined,

  async render(request, signal) {
    const apiKey = serverEnv.TRY_ON_PROVIDER_API_KEY;
    if (apiKey === undefined) return err('PROVIDER_DISABLED');

    const url = `${PROVIDER_ORIGIN}/v1beta/models/${serverEnv.TRY_ON_PROVIDER_MODEL}:generateContent`;

    /*
     * ERR-05(1): fetch signals transport failure — and abort — only by
     * rejecting. Converted to a value here, never propagated as a throw.
     *
     * DATA-01 does not apply: this is an external provider, not the Java
     * backend, so it does not go through `apiRequest`. That client exists to
     * carry OUR contract, our headers and our error model; none of them mean
     * anything here.
     */
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(requestBodyFor(request)),
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

    // A well-formed response with no picture is a refusal: this request failed,
    // the contract did not. It must not masquerade as the latter.
    return image === null ? err('PROVIDER_FAILED') : ok(image);
  },
};
