'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

import { EMPTY_QUERY, toQueryString } from '../lib/search-params';

export interface SearchFieldProps {
  initialTerm: string;
  messages: Messages;
}

/**
 * The search box.
 *
 * FORM-02 allows a plain controlled input here: "hand-rolled useState-per-field
 * forms are PROHIBITED beyond a single-input search box", and this is precisely
 * that box. Reaching for React Hook Form would be more machinery than one field
 * with no validation rules deserves.
 *
 * Submitting navigates rather than fetching, so the results page stays a Server
 * Component and the resulting URL is shareable and back-button-correct — the
 * same reason filters live in the URL (STATE-01 rung 4).
 */
export function SearchField({ initialTerm, messages }: SearchFieldProps) {
  const router = useRouter();
  const [term, setTerm] = useState(initialTerm);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const trimmed = term.trim();
    // Submitting an empty box would land on a results page for nothing.
    if (trimmed.length === 0) return;

    // Built through the canonical serialiser so a searched URL and a filtered
    // one are the same shape (NEXT-08: navigation via the router).
    router.push(`${ROUTES.search}${toQueryString({ ...EMPTY_QUERY, term: trimmed })}`);
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="flex gap-2">
      {/* FORM-05: the label is programmatically associated with the input. */}
      <label htmlFor="catalogue-search" className="sr-only">
        {messages.search.inputLabel}
      </label>
      <Input
        id="catalogue-search"
        type="search"
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
        }}
        placeholder={messages.search.placeholder}
        autoComplete="off"
      />
      <Button type="submit" className="shrink-0">
        {messages.search.submit}
      </Button>
    </form>
  );
}
