import type { Locale } from '@/i18n/locales';
import { useMessages } from '@/i18n/use-messages';
import type { MeasurementPointId } from '@/lib/domain/ids';
import { formatTemplate } from '@/lib/utils/format';

import type { ReviewGroup } from '../lib/review';
import { keptText, typedText } from '../lib/review-text';
import type { CaptureSource } from '../schemas/measurement-set.schema';
import { ReviewChoices } from './ReviewChoices';

export interface ReviewTableProps {
  readonly group: ReviewGroup;
  /** A save is under way: nothing may be changed out from under it. */
  readonly isLocked: boolean;
  readonly onChange: (id: MeasurementPointId) => void;
  /** Off a card, "as typed" is the bare figure — see `typedText`. */
  readonly source: CaptureSource;
  readonly locale: Locale;
}

/**
 * One garment's figures, twice each. A table, because the point is to compare
 * across a row. On a narrow panel the typed figure moves under the measurement's
 * name instead of taking a column of its own — see `.mm-review-typed`; a figure
 * the customer was asked about and kept says so in the same place.
 */
export function ReviewTable({ group, isLocked, onChange, source, locale }: ReviewTableProps) {
  const t = useMessages().madeToMeasure;

  return (
    <div className="flex flex-col gap-3">
      <ReviewChoices choices={group.choices} />
      <div className="mm-review-scroll">
        <table className="mm-review-table">
          <caption>{group.piece.label}</caption>
          <thead>
            <tr>
              <th scope="col">{t.reviewColumnPoint}</th>
              <th scope="col" className="mm-review-typed">
                {t.reviewColumnTyped}
              </th>
              <th scope="col">{t.reviewColumnRecorded}</th>
              <th scope="col">
                <span className="sr-only">{t.reviewChange}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row) => (
              <tr key={row.point.id}>
                <th scope="row">
                  {row.point.label}
                  <span className="mm-review-typed-inline">{typedText(row, t, source)}</span>
                  {row.kept ? <span className="mm-review-kept">{t.reviewKept}</span> : null}
                </th>
                <td className="mm-review-typed">{typedText(row, t, source)}</td>
                <td className="mm-review-recorded">{keptText(row, t, locale)}</td>
                <td>
                  <button
                    type="button"
                    className="mm-review-change"
                    disabled={isLocked}
                    aria-label={formatTemplate(t.reviewChangeLabel, { label: row.point.label })}
                    onClick={() => {
                      onChange(row.point.id);
                    }}
                  >
                    {t.reviewChange}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
