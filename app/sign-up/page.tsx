import type { Metadata } from 'next';

import { CLIENT } from '@/config/client';
import { RETURN_TO_PARAM } from '@/config/routes';
import { SignUpForm } from '@/features/auth';
import { getMessages } from '@/i18n';
import { returnPathFrom } from '@/lib/utils/return-path';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  return { title: messages.auth.signUpHeading, robots: { index: false, follow: false } };
}

export interface SignUpPageProps {
  // NEXT-03: searchParams is a Promise in Next.js 16.
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Registration. STRUCT-02: the route composes only. */
export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const [messages, query] = await Promise.all([getMessages(), searchParams]);

  return (
    <section className="page-shell max-w-sm py-12">
      <h1 className="text-fg text-2xl font-semibold">{messages.auth.signUpHeading}</h1>
      <p className="text-fg-muted mt-2 mb-6 text-sm">{messages.auth.signUpBody}</p>

      <SignUpForm
        messages={messages}
        mobileExample={CLIENT.market.mobile.example}
        // SEC-06: the way back is untrusted input, allow-listed before anything uses it.
        returnTo={returnPathFrom(query[RETURN_TO_PARAM])}
      />
    </section>
  );
}
