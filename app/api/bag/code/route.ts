import { applyCode, readCartId } from '@/features/bag';
import { applyCodeRequestSchema } from '@/features/bag/contract';
import { getLocale } from '@/i18n';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';

/**
 * §16 `applyCode(cart, code)`. D6 — lifting it is its own route, at `./removal`.
 *
 * DATA-13: whether a code exists, what it is worth and why it was refused are
 * all Pricing's answers. This route forwards a string and renders back whatever
 * it is told — it does not know a single code, and must not learn one.
 */
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function POST(request: Request): Promise<Response> {
  await ensureMockServer();

  const cartId = await readCartId();
  if (cartId === null) return new Response(null, { status: 404 });

  const body: unknown = await request.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  const parsed = applyCodeRequestSchema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });

  const result = await applyCode(cartId, parsed.data.code, await getLocale());

  if (!result.ok) {
    logApiError('api:bag:code:post', result.error); // ERR-10
    return new Response(null, { status: 502 });
  }

  // A refused code is a 200 carrying `REJECTED`, for the same reason
  // `Unavailable` is: it is an answer, not a failed request.
  return Response.json(result.value, { headers: NO_STORE });
}
