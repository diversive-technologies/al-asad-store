import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/locales';
import { useMessages } from '@/i18n/use-messages';

import { requiredTaken } from '../lib/entries';
import { formView } from '../lib/form-view';
import { requiredIds } from '../lib/measurement-set';
import type { StudioSet } from '../lib/studio-set';
import type { SaveProblem } from '../lib/studio-step';
import { MeasurementErrorSummary } from './MeasurementErrorSummary';
import { MeasurementFieldsets } from './MeasurementFieldsets';
import { MeasurementProgress } from './MeasurementProgress';
import { MeasurementStepper } from './MeasurementStepper';
import { NoteSummary } from './NoteSummary';
import { StudioProblemNotice } from './StudioProblemNotice';
import type { StudioFlow } from './studio-flow';
import { UnitToggle } from './UnitToggle';

export interface MeasurementFormBodyProps {
  readonly studio: StudioSet;
  readonly flow: StudioFlow;
  /** The server's check is under way. */
  readonly isChecking: boolean;
  /** A problem with no field to stand on — see `StudioProblemNotice`. */
  readonly problem: SaveProblem | null;
  readonly locale: Locale;
}

/**
 * The fields, in the served order, and the one action: ask the server to check
 * them. What is WRONG is listed in red above them; what is only worth a second
 * look has its own quiet list, so the two are never mistaken for each other.
 * Rendered inside `MeasurementStudio`'s client boundary (MOD-06).
 */
export function MeasurementFormBody({
  studio,
  flow,
  isChecking,
  problem,
  locale,
}: MeasurementFormBodyProps) {
  const messages = useMessages();
  const t = messages.madeToMeasure;
  const { measuring, focus, notes } = flow;
  const view = formView(
    {
      studio,
      problems: measuring.problems,
      notes,
      unit: measuring.unit,
      values: measuring.values,
      locale,
    },
    t,
  );

  return (
    <form onSubmit={flow.submitForCheck} noValidate className="mt-10 flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <UnitToggle unit={measuring.unit} onChange={measuring.changeUnit} messages={messages} />
        <MeasurementProgress
          done={requiredTaken(studio.points, measuring.filledIds)}
          total={requiredIds(studio.points).length}
          messages={messages}
          locale={locale}
        />
      </div>

      {view.errorGroups.length === 0 ? null : (
        <MeasurementErrorSummary
          groups={view.errorGroups}
          onJump={flow.jump}
          summaryRef={measuring.summaryRef}
          messages={messages}
        />
      )}

      {view.noteGroups.length === 0 ? null : (
        <NoteSummary
          groups={view.noteGroups}
          onJump={flow.jump}
          summaryRef={notes.summaryRef}
          messages={messages}
          outstanding={notes.outstanding}
          source={studio.source}
        />
      )}

      <MeasurementFieldsets studio={studio} flow={flow} view={view} />

      <MeasurementStepper focus={focus} messages={messages} locale={locale} />

      {/* §34.7 / Risk 8 — cloth gets cut, so the notice sits with the
          action rather than in terms nobody reads afterwards. */}
      <p className="text-fg-muted text-xs text-balance">{t.cutNotice}</p>

      {problem === null ? null : <StudioProblemNotice problem={problem} />}

      {/* Busy, not disabled: a disabled button drops the focus it holds, and the
          submit latch already refuses a second press. */}
      <Button type="submit" size="lg" aria-busy={isChecking}>
        {isChecking ? t.checking : t.saveCta}
      </Button>
    </form>
  );
}
