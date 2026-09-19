import { currentAccountKey } from '@/features/auth/server';
import { forgetSize, savedSizeChoiceSchema } from '@/features/saved-sizes';
import { getLocale } from '@/i18n';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';
import { isSameOrigin } from '@/lib/utils/request';
import { NO_STORE, readJsonBody } from '@/lib/utils/route';

/**
 * D6 — forgetting a saved size is RECORDED at its own path, never a DELETE.
 *
 * The size the customer had saved, and when, stay on file; it simply stops being
 * chosen for them. The body names the SIZE rather than its set, so a page opened
 * before the set changed in another tab is refused rather than allowed to forget
 * a size it never showed.
 *
 * CMP-03: Route Handlers require NAMED method exports.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  // SEC-08 — a write, so a foreign origin is refused before anything else.
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  // D1 — a Route Handler never renders the root layout, so it arms its own context.
  await ensureMockServer();

  const accountKey = await currentAccountKey();
  if (accountKey === null) return new Response(null, { status: 401 });

  // SEC-02 — the body is untrusted input, parsed rather than cast.
  const body = savedSizeChoiceSchema.safeParse(await readJsonBody(request));
  if (!body.success) return new Response(null, { status: 400 });

  const sizes = await forgetSize(accountKey, body.data.sizeId, await getLocale());
  if (!sizes.ok) {
    logApiError('api:saved-sizes:removal', sizes.error); // ERR-10, once
    /* A size that is no longer the current one is the failure the customer can
       make sense of: the page was opened before it changed. */
    return new Response(null, { status: sizes.error.kind === 'NOT_FOUND' ? 404 : 502 });
  }

  return Response.json(sizes.value, { headers: NO_STORE });
}
