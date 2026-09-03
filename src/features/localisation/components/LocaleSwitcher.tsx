'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/locales';
import { useMessages } from '@/i18n/use-messages';

import { setLocaleAction } from '../actions';

export interface LocaleSwitcherProps {
  currentLocale: Locale;
}

/**
 * I18N-02 — copy resolves from the provider at runtime, never from a per-locale
 * import. I18N-03 — this component chooses the locale; it does not decide its
 * own direction. The root layout owns `dir`.
 */
export function LocaleSwitcher({ currentLocale }: LocaleSwitcherProps) {
  const t = useMessages();
  const [, formAction, isPending] = useActionState(setLocaleAction, null);

  const nextLocale: Locale = currentLocale === 'en' ? 'ur' : 'en';
  const label = nextLocale === 'ur' ? t.common.switchToUrdu : t.common.switchToEnglish;

  return (
    <form action={formAction} aria-label={t.common.languageGroupLabel}>
      <input type="hidden" name="locale" value={nextLocale} />
      <Button type="submit" variant="ghost" size="sm" isLoading={isPending}>
        {label}
      </Button>
    </form>
  );
}
