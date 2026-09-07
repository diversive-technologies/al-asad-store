import type { Metadata } from 'next';

import { CLIENT } from '@/config/client';
import { SignUpForm } from '@/features/auth';
import { getMessages } from '@/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  return { title: messages.auth.signUpHeading, robots: { index: false, follow: false } };
}

/** Registration. STRUCT-02: the route composes only. */
export default async function SignUpPage() {
  const messages = await getMessages();

  return (
    <section className="page-shell max-w-sm py-12">
      <h1 className="text-fg text-2xl font-semibold">{messages.auth.signUpHeading}</h1>
      <p className="text-fg-muted mt-2 mb-6 text-sm">{messages.auth.signUpBody}</p>

      <SignUpForm messages={messages} mobileExample={CLIENT.market.mobile.example} />
    </section>
  );
}
