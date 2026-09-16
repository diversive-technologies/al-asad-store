import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatNumber, formatTemplate } from '@/lib/utils/format';

export interface CutCutoffNoticeProps {
  leadTimeDays: number;
  /** Whether anything in the order is NOT being cut — see `cutCutoffOthers`. */
  hasOtherItems: boolean;
  locale: Locale;
  messages: Messages;
}

/**
 * §34.7's cut cutoff, stated before payment on the screen that shows the price.
 *
 * The spec asks for it in those terms, and nothing in the store said it until
 * now: a customer could measure a garment, have it priced and pay for it without
 * ever being told that a garment cut to their figures cannot come back.
 *
 * It is a NOTICE and not an alert. Nothing has gone wrong and nothing needs
 * dismissing — this is a condition of the purchase, so it reads as one and stays
 * on the page rather than interrupting.
 *
 * It says what is still returnable too — but ONLY when there is something else.
 * "Cannot be returned" beside a total that also covers two ordinary shirts would
 * be read as covering all three; "everything else can be returned as usual" on an
 * order of nothing but cut garments is a promise about nothing, and the reader
 * has to work out that it excludes the only thing they bought.
 *
 * The heading names no NUMBER for the same reason: "One item is being cut" is
 * false the moment somebody orders two, and the quote carries a flag rather than
 * a count.
 */
export function CutCutoffNotice({
  leadTimeDays,
  hasOtherItems,
  locale,
  messages,
}: CutCutoffNoticeProps) {
  const t = messages.checkout;

  return (
    <section
      aria-labelledby="cut-cutoff"
      className="border-border rounded-card mt-4 border p-4 text-sm"
    >
      <h2 id="cut-cutoff" className="text-fg font-medium">
        {t.cutCutoffHeading}
      </h2>
      <p className="text-fg-muted mt-1">{t.cutCutoffBody}</p>
      {hasOtherItems ? <p className="text-fg-muted mt-1">{t.cutCutoffOthers}</p> : null}
      {leadTimeDays > 0 ? (
        <p className="text-fg-muted mt-1">
          {/* I18N-08: through the locale's own number formatter, not `String`. */}
          {formatTemplate(t.cutCutoffLeadTime, { days: formatNumber(leadTimeDays, locale) })}
        </p>
      ) : null}
    </section>
  );
}
