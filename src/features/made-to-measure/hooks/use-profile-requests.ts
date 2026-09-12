'use client';

import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { unwrap } from '@/lib/result';

import { requestCheck, requestSave } from '../api/profile-browser';
import type { StudioPoint } from '../lib/studio-set';
import { judgeCheck, judgeRejection, type CheckVerdict } from '../lib/verdicts';
import type { SaveResult } from '../lib/studio-step';
import type { MeasurementSubmission } from '../schemas/profile.schema';

export interface UseProfileRequestsResult {
  readonly checking: UseMutationResult<CheckVerdict, unknown, MeasurementSubmission>;
  readonly saving: UseMutationResult<SaveResult, unknown, MeasurementSubmission>;
}

/**
 * §34.4's two requests, `validate` and `saveProfile`, each JUDGED as it lands —
 * against the points asked — so the studio's step can be read straight off them
 * (`stepOf`).
 *
 * DATA-03a — `unwrap` turns the BFF's Result into the rejection TanStack reads.
 */
export function useProfileRequests(points: readonly StudioPoint[]): UseProfileRequestsResult {
  const checking = useMutation({
    mutationFn: async (sent: MeasurementSubmission): Promise<CheckVerdict> => {
      const check = await unwrap(requestCheck(sent));
      return judgeCheck(check, points);
    },
  });
  const saving = useMutation({
    mutationFn: async (sent: MeasurementSubmission): Promise<SaveResult> => {
      const outcome = await unwrap(requestSave(sent));
      if (outcome.kind === 'SAVED') return outcome;
      return { kind: 'REJECTED', verdict: judgeRejection(outcome.findings, points) };
    },
  });
  return { checking, saving };
}
