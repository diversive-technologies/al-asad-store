import type { Metadata } from 'next';

import { SignInForm } from '@/features/auth';
import { getMessages } from '@/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  return { title: messages.auth.signInHeading };
}

/** D3 — the placeholder sign-in screen. STRUCT-02: it composes only. */
export default async function SignInPage() {
  const messages = await getMessages();

  return (
    <section className="p-gutter mx-auto flex max-w-sm flex-col gap-4 py-12">
      <h1 className="text-fg text-2xl font-semibold">{messages.auth.signInHeading}</h1>
      <p className="text-fg-muted">{messages.auth.signInBody}</p>

      <p className="rounded-card border-border bg-surface-muted text-fg-muted border p-3 text-sm">
        {messages.auth.placeholderNotice}
      </p>

      <SignInForm />
    </section>
  );
}
