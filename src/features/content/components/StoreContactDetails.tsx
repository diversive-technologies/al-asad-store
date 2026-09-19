import { CLIENT } from '@/config/client';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatClockTime, formatTemplate, formatWeekday } from '@/lib/utils/format';

import { mailtoHref, telHref, whatsAppChatHref } from '../lib/contact-links';

export interface StoreContactDetailsProps {
  locale: Locale;
  messages: Messages;
}

/** One way to reach the store: what it is called, where it goes, what it shows. */
interface ContactLink {
  readonly key: string;
  readonly label: string;
  readonly href: string;
  readonly text: string;
  /** WhatsApp opens outside the store, so it takes a new tab and says so (SEC-09). */
  readonly opensNewTab: boolean;
}

/* A11Y: 32px tall, so a finger can hit each one; underlined, so colour is not the only cue. */
const LINK_CLASS =
  'text-fg inline-flex min-h-8 items-center underline decoration-1 underline-offset-4';
const TERM_CLASS = 'text-fg-muted text-sm';

/** The phone, the WhatsApp chat and the email, from the client profile. */
function contactLinks(messages: Messages): readonly ContactLink[] {
  const t = messages.storeContact;
  const { phone, whatsApp, email } = CLIENT.contact;

  return [
    { key: 'phone', label: t.phoneLabel, href: telHref(phone), text: phone, opensNewTab: false },
    {
      key: 'whatsapp',
      label: t.whatsAppLabel,
      href: whatsAppChatHref(whatsApp),
      text: whatsApp,
      opensNewTab: true,
    },
    { key: 'email', label: t.emailLabel, href: mailtoHref(email), text: email, opensNewTab: false },
  ];
}

/**
 * The store's phone, WhatsApp, email, hours and address, on the Contact us page.
 *
 * Read from the client profile (`CLIENT.contact`, D5), never from content: a
 * number a customer dials is configuration a deployment owns, and the content
 * around it is the client's to reword without being able to break it. Every
 * value there is FIXTURE until the client supplies its own.
 *
 * `<address>` because this is exactly what the element is for: how to reach the
 * people behind the page. A number or an address is wrapped in `<bdi>` so an
 * Urdu page cannot reorder its digits and punctuation.
 */
export function StoreContactDetails({ locale, messages }: StoreContactDetailsProps) {
  const t = messages.storeContact;
  const { address, hours } = CLIENT.contact;
  // I18N-10: a locale without its own address falls back to the default one.
  const addressLines = address[locale] ?? address[DEFAULT_LOCALE] ?? [];
  const links = contactLinks(messages);

  return (
    <section className="border-border rounded-card p-gutter flex flex-col gap-4 border">
      <h2 className="text-fg text-xl font-medium">{t.heading}</h2>

      <address className="not-italic">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {links.map((link) => (
            <div key={link.key}>
              <dt className={TERM_CLASS}>{link.label}</dt>
              <dd>
                <a
                  href={link.href}
                  target={link.opensNewTab ? '_blank' : undefined}
                  rel={link.opensNewTab ? 'noopener noreferrer' : undefined}
                  className={LINK_CLASS}
                >
                  <bdi>{link.text}</bdi>
                  {link.opensNewTab ? (
                    <span className="sr-only"> {messages.common.opensInNewTab}</span>
                  ) : null}
                </a>
              </dd>
            </div>
          ))}

          <div>
            <dt className={TERM_CLASS}>{t.hoursLabel}</dt>
            <dd className="text-fg">
              {formatTemplate(t.hours, {
                firstDay: formatWeekday(hours.firstDay, locale),
                lastDay: formatWeekday(hours.lastDay, locale),
                opens: formatClockTime(hours.opens, locale),
                closes: formatClockTime(hours.closes, locale),
              })}
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className={TERM_CLASS}>{t.addressLabel}</dt>
            {addressLines.map((line) => (
              <dd key={line} className="text-fg">
                <bdi>{line}</bdi>
              </dd>
            ))}
          </div>
        </dl>
      </address>
    </section>
  );
}
