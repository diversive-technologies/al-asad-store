'use client';

import { useState, type FormEvent } from 'react';

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/query-keys';
import { unwrap } from '@/lib/result';

import { fetchFabricVerdict } from '../api/fetch-fabric-verdict';
import type { FabricVerdict } from '../schemas/fabric-calculator.schema';

export interface FabricVerdictRead {
  readonly verdict: FabricVerdict | undefined;
  readonly isUnavailable: boolean;
  readonly submit: (event: FormEvent<HTMLFormElement>) => void;
}

interface SubmittedQuery {
  heightCm: number;
  styleId: string;
}

/**
 * §25's read, keyed on what was submitted.
 *
 * "A pure function. No customer input is stored." — so this is a READ keyed on
 * its inputs, not a submission. Nothing is persisted, and re-checking the same
 * height is served from cache rather than asked again.
 *
 * The height is submitted rather than checked per keystroke: someone typing
 * "173" passes through 1 and 17, and telling them their cloth is 3 metres short
 * on the way to a valid answer is worse than telling them nothing.
 */
export function useFabricVerdict(productId: string): FabricVerdictRead {
  const [submitted, setSubmitted] = useState<SubmittedQuery | null>(null);
  const heightCm = submitted?.heightCm ?? 0;
  const styleId = submitted?.styleId ?? '';

  const verdict = useQuery({
    queryKey: queryKeys.catalogue.fabricVerdict(productId, heightCm, styleId),
    queryFn: ({ signal }) => unwrap(fetchFabricVerdict({ productId, heightCm, styleId }, signal)),
    enabled: submitted !== null,
    // DATA-09: held for the visit, because re-checking the same height is the
    // common action and the answer cannot change while the page is open.
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    verdict: verdict.data,
    isUnavailable: verdict.isError,
    submit: (event) => {
      event.preventDefault();

      const data = new FormData(event.currentTarget);
      const height = Number(data.get('heightCm'));
      const style = String(data.get('styleId') ?? '');

      // The browser's own `required`/`min`/`max` handle the empty and out-of-range
      // cases; this guards only against a value that is not a number at all.
      if (!Number.isFinite(height) || style.length === 0) return;

      setSubmitted({ heightCm: Math.round(height), styleId: style });
    },
  };
}
