import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import type { ReviewGroup } from '../lib/review';
import { keptText, typedText } from '../lib/review-text';
import type { CaptureSource } from '../schemas/measurement-set.schema';

export interface SavedFiguresProps {
  readonly group: ReviewGroup;
  /** Off a card, "as typed" is the bare figure — see `typedText`. */
  readonly source: CaptureSource;
  readonly locale: Locale;
  readonly messages: Messages;
}

/**
 * One garment's saved figures, as typed and as kept.
 *
 * The review's table without its "Change" column, rather than the review's table
 * with that column disabled: on this page there is nothing to change into, and a
 * control that cannot do its job is worse than none. What is SHARED is the part
 * that could drift — the arithmetic and the wording are `typedText` and
 * `keptText`, so the two screens can never disagree about what a figure records
 * as, and the styling is the review's own classes (PD-01).
 *
 * A Server Component: it takes its words as a prop rather than from the client
 * context, so the account page ships no JavaScript for any of this.
 */
export function SavedFigures({ group, source, locale, messages }: SavedFiguresProps) {
  const t = messages.madeToMeasure;

  return (
    <div className="mm-review-scroll">
      <table className="mm-review-table mm-saved-table">
        <caption>{group.piece.label}</caption>
        <thead>
          <tr>
            <th scope="col">{t.reviewColumnPoint}</th>
            <th scope="col" className="mm-review-typed">
              {t.reviewColumnTyped}
            </th>
            <th scope="col">{t.reviewColumnRecorded}</th>
          </tr>
        </thead>
        <tbody>
          {group.rows.map((row) => (
            <tr key={row.point.id}>
              <th scope="row">
                {row.point.label}
                {/* On a narrow card the typed figure moves under the name — the
                    review's own behaviour, from its container query. */}
                <span className="mm-review-typed-inline">{typedText(row, t, source)}</span>
                {row.kept ? <span className="mm-review-kept">{t.reviewKept}</span> : null}
              </th>
              <td className="mm-review-typed">{typedText(row, t, source)}</td>
              <td className="mm-review-recorded">{keptText(row, t, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
