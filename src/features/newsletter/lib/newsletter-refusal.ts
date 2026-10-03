import type { Messages } from '@/i18n/messages/en';
import type { ApiError } from '@/lib/api/errors';

/**
 * MOD-04 — where a failed newsletter subscription is said, and in what words.
 *
 * The address field when the backend refused the address itself (FORM-04); the
 * form as a whole for everything else, where a limit per address (F-09) is told
 * apart from a store that could not be reached, so a customer who has tried too
 * often waits rather than retrying against a store that is not down. ERR-11: the
 * backend's own text is never rendered — copy comes from SSOT-07.
 */
export interface NewsletterRefusal {
  readonly field: 'email' | 'root';
  readonly message: string;
}

export function newsletterRefusal(error: ApiError, messages: Messages): NewsletterRefusal {
  switch (error.kind) {
    case 'VALIDATION':
      return { field: 'email', message: messages.newsletter.invalidEmail };
    case 'RATE_LIMITED':
      return { field: 'root', message: messages.newsletter.rateLimited };
    default:
      return { field: 'root', message: messages.errors.network };
  }
}
