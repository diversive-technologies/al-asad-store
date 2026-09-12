import type { ReviewChoice } from '../lib/review';

export interface ReviewChoicesProps {
  readonly choices: readonly ReviewChoice[];
}

/**
 * The finishing choices first, at the weight of a row: what the figures were
 * taken for is the first thing to check.
 */
export function ReviewChoices({ choices }: ReviewChoicesProps) {
  if (choices.length === 0) return null;

  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {choices.map((choice) => (
        <div key={choice.id} className="flex gap-1.5">
          <dt className="text-fg-muted">{choice.group}</dt>
          <dd className="text-fg font-medium">{choice.value}</dd>
        </div>
      ))}
    </dl>
  );
}
