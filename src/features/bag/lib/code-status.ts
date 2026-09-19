import { formatTemplate } from '@/lib/utils/format';

import type { AppliedCode } from '../schemas/bag.schema';

/** The bag's messages this needs — `messages.bag` satisfies it. */
export interface CodeStatusWords {
  /** `{code}` — the code as Pricing wrote it back, not as it was typed. */
  readonly codeAppliedStatus: string;
  readonly codeRemovedStatus: string;
}

/**
 * MOD-04 — what the bag says once a code is applied or lifted (§30.3: bag changes
 * are announced). The form and the applied code swap places on either, so without
 * it nothing said what had happened. Read off the code the BACKEND now holds.
 */
export function codeStatusFor(applied: AppliedCode | null, words: CodeStatusWords): string {
  return applied === null
    ? words.codeRemovedStatus
    : formatTemplate(words.codeAppliedStatus, { code: applied.code });
}
