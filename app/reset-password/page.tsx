import type { Metadata } from 'next';

import { PasswordResetConfirmForm, resetTokenSchema, ResetLinkExpired } from '@/features/auth';
import { getMessages } from '@/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  // The address carries a one-time secret: never indexed, never followed.
  return { title: messages.auth.newPasswordHeading, robots: { index: false, follow: false } };
}

export interface ResetPasswordPageProps {
  // NEXT-03: searchParams is a Promise in Next.js 16.
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * F-03 — where a password-reset email's link lands (`?token=`).
 *
 * The token is untrusted input and is judged here, on the server, before any form
 * is drawn: a link with no token, a repeated one or one that is not 64 hexadecimal
 * characters gets the same "expired" screen a spent link does, so there is nothing
 * to learn from the difference. `Referrer-Policy: no-referrer` for this path is
 * set in `next.config.ts`, so the token cannot leak to another site.
 *
 * STRUCT-02: the route composes only.
 */
export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const [messages, query] = await Promise.all([getMessages(), searchParams]);
  const token = resetTokenSchema.safeParse(query.token);

  return (
    <section className="page-shell max-w-sm py-12">
      <h1 className="text-fg text-2xl font-semibold">{messages.auth.newPasswordHeading}</h1>

      {token.success ? (
        <>
          <p className="text-fg-muted mt-2 mb-6 text-sm">{messages.auth.newPasswordBody}</p>
          <PasswordResetConfirmForm messages={messages} token={token.data} />
        </>
      ) : (
        <div className="mt-6">
          <ResetLinkExpired messages={messages} takeFocus={false} />
        </div>
      )}
    </section>
  );
}
