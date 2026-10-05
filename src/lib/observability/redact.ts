/**
 * F-08 — personal data never goes to the error tracker.
 *
 * The messages the storefront logs are built to carry no customer data (SEC-10),
 * but a message is assembled from many places and a stack of text is the last
 * place anybody checks. So everything is masked once more on its way out, here,
 * and what a mask cannot be sure of it removes.
 *
 * Pure and framework-free: the log module and the Sentry hooks both use it, and
 * neither may differ on what counts as personal.
 */

/**
 * `ali@example.com`, and anything of the shape local@domain. The domain's last
 * label stops before a trailing full stop, so a sentence ending in an address
 * keeps its full stop.
 */
const EMAIL = /[^\s@<>()[\]",;:]+@(?:[^\s@<>()[\]",;:.]+\.)+[^\s@<>()[\]",;:.]+/g;

/**
 * A telephone number: nine or more digits, optionally led by `+` and with single
 * spaces, dashes, dots or brackets between them — `03001234567`, `+92 300 1234567`,
 * `0300-1234567`, `(0300) 1234567`. Nine is below the shortest national number
 * and above an order number (`AA100001`) or a status code. A run that follows a
 * hyphen is the tail of an identifier, such as a UUID's last group, and is left.
 */
const PHONE = /(?<![\w.-])\+?\(?\d(?:[\s\-.()]{0,2}\d){8,}(?!\w)/g;

const EMAIL_MASK = '[email]';
const PHONE_MASK = '[phone]';

/** `text` with every email and telephone number replaced by a fixed placeholder. */
export function maskPersonalData(text: string): string {
  return text.replace(EMAIL, EMAIL_MASK).replace(PHONE, PHONE_MASK);
}
