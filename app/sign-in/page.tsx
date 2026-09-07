import type { Metadata } from 'next';

import { CLIENT } from '@/config/client';
import { SignInScreen } from '@/features/auth';
import { getMessages } from '@/i18n';
import { serverEnv } from '@/config/env.server';
import { TEST_CREDENTIALS } from '@/lib/mocks/auth-db';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  // A sign-in page has nothing to offer a search engine (§30.5).
  return { title: messages.auth.signInHeading, robots: { index: false, follow: false } };
}

/** §11's two ways in. STRUCT-02: the route composes only. */
export default async function SignInPage() {
  const messages = await getMessages();

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
    />
  );
}
