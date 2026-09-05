'use client';

import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import { BagContents } from './BagContents';
import { BagTotals } from './BagTotals';
import { useBag } from './BagProvider';

export interface BagPageScreenProps {
  locale: Locale;
  messages: Messages;
}

/**
 * The `/bag` page — the same bag the panel shows, at its own address.
 *
 * It exists because the panel is a convenience, not the only way in: the header
 * bag icon is a link, a customer can bookmark the page, and a narrow screen has
 * far more room in a page than in a slide-over. Both surfaces render
 * `BagContents`, so there is one implementation of a bag line and one place
 * where editing it is wired.
 */
export function BagPageScreen({ locale, messages }: BagPageScreenProps) {
  const t = messages.bag;
  const { bag } = useBag();
  const summary = bag.data;
  const hasLines = summary !== undefined && summary.lines.length > 0;

  return (
    <section className="page-shell py-10">
      <h1 className="text-fg text-2xl font-semibold">{t.title}</h1>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <BagContents locale={locale} messages={messages} />
        </div>

        {!hasLines ? null : (
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <BagTotals summary={summary} locale={locale} messages={messages} />
            <ButtonLink
              href={ROUTES.checkout}
              variant="primary"
              size="lg"
              className="mt-4 w-full"
            >
              {t.checkout}
            </ButtonLink>
          </aside>
        )}
      </div>
    </section>
  );
}
