import type { Metadata } from 'next';

import { PasswordResetForm } from '@/features/auth';
import { getMessages } from '@/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  return { title: messages.auth.resetHeading, robots: { index: false, follow: false } };
}

/** §11 `resetPassword(email)`. STRUCT-02: the route composes only. */
export default async function ForgotPasswordPage() {
  const messages = await getMessages();

  return (
    <section className="page-shell max-w-sm py-12">
      <h1 className="text-fg text-2xl font-semibold">{messages.auth.resetHeading}</h1>
      <p className="text-fg-muted mt-2 mb-6 text-sm">{messages.auth.resetBody}</p>

      <PasswordResetForm messages={messages} />
    </section>
  );
}
