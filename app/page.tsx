import { ErrorState } from '@/components/shared/ErrorState';
import { serverEnv } from '@/config/env.server';
import { fetchHealth, FoundationStatus } from '@/features/system';
import { getLocale, getMessages } from '@/i18n';
import { logApiError } from '@/lib/utils/log';

/**
 * STRUCT-02 — the route layer composes; it does not implement. It resolves
 * inputs, calls the data layer, and hands the result to a presentational
 * component.
 */
export default async function HomePage() {
  // PERF-02: independent reads run in parallel.
  const [locale, messages, result] = await Promise.all([getLocale(), getMessages(), fetchHealth()]);

  // ERR-02: the failure path is handled as a value, not caught.
  if (!result.ok) {
    // ERR-10: logged once, here, at the boundary that handles it.
    logApiError('home', result.error);
    // ERR-11: user-facing copy comes from SSOT-07, never from error.message.
    return <ErrorState message={messages.errors.network} />;
  }

  return (
    <main>
      <FoundationStatus
        health={result.value}
        locale={locale}
        isMocked={serverEnv.API_MOCKING === 'enabled'}
        messages={messages}
      />
    </main>
  );
}
