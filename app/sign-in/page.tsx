import type { Metadata } from 'next';

import { CLIENT } from '@/config/client';
import { RETURN_TO_PARAM } from '@/config/routes';
import { SignInScreen } from '@/features/auth';
import { getMessages } from '@/i18n';
import { returnPathFrom } from '@/lib/utils/return-path';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  // A sign-in page has nothing to offer a search engine (§30.5).
  return { title: messages.auth.signInHeading, robots: { index: false, follow: false } };
}

export interface SignInPageProps {
  // NEXT-03: searchParams is a Promise in Next.js 16.
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** §11's two ways in. STRUCT-02: the route composes only. */
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [messages, query] = await Promise.all([getMessages(), searchParams]);

  return (
    <SignInScreen
      messages={messages}
      mobileExample={CLIENT.market.mobile.example}
      // SEC-06: the way back is untrusted input, allow-listed before anything uses it.
      returnTo={returnPathFrom(query[RETURN_TO_PARAM])}
    />
  );
}
