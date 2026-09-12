import { useRouter } from 'next/navigation';

import { useMessages } from '@/i18n/use-messages';

import type { SaveProblem } from '../lib/studio-step';

export interface StudioProblemNoticeProps {
  readonly problem: SaveProblem;
}

/**
 * A problem with no field to stand on. The store unreachable is answered by
 * trying again, and the customer's figures are still on the page. A list that
 * changed under the page is answered by loading the new one: a refresh re-reads
 * it on the server while the studio — and every figure in it — stays mounted.
 */
export function StudioProblemNotice({ problem }: StudioProblemNoticeProps) {
  const t = useMessages().madeToMeasure;
  const router = useRouter();

  if (problem === 'UNAVAILABLE') {
    return (
      <p role="alert" className="text-danger-500 text-sm">
        {t.storeUnreachable}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm">
      <p role="alert" className="text-danger-500">
        {t.checkStale}
      </p>
      <button
        type="button"
        className="mm-review-change"
        onClick={() => {
          router.refresh();
        }}
      >
        {t.loadNewGuide}
      </button>
    </div>
  );
}
