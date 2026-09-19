import type { Metadata } from 'next';

import { CLIENT } from '@/config/client';
import { RETURN_TO_PARAM } from '@/config/routes';
import { SignInScreen } from '@/features/auth';
import { getMessages } from '@/i18n';
import { serverEnv } from '@/config/env.server';
import { TEST_CREDENTIALS } from '@/lib/mocks/auth-db';
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

  /*
   * The seeded credentials are shown ONLY while the mock layer is armed. With a
   * real backend `API_MOCKING` is off, this is null, and the notice disappears
   * — a test account printed on a live sign-in page would be a way in.
   */
  const testHint =
    serverEnv.API_MOCKING === 'enabled'
      ? { email: TEST_CREDENTIALS.email, password: TEST_CREDENTIALS.password }
      : null;

  return (
    <SignInScreen
      messages={messages}
      mobileExample={CLIENT.market.mobile.example}
      testHint={testHint}
      // SEC-06: the way back is untrusted input, allow-listed before anything uses it.
      returnTo={returnPathFrom(query[RETURN_TO_PARAM])}
    />
  );
}
