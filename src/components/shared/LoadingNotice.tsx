'use client';

import { useMessages } from '@/i18n/use-messages';

/**
 * What a surface says for the moment its code is still arriving — a part of the
 * page fetched on demand (IMP-01a, PERF-10) and asked for before the download
 * finished. In words and polite, because an empty panel reads as a broken one
 * (A11Y-05). It is `OnDemand`'s `loading` wherever a customer can see the
 * wait: the bag panel, the try-on dialog, the studio's review, the gallery.
 *
 * A client component because it reads the dictionary from context (I18N-02).
 */
export function LoadingNotice() {
  const t = useMessages();

  return (
    <p role="status" className="text-fg-muted text-sm">
      {t.common.loading}
    </p>
  );
}
