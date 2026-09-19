import { useMessages } from '@/i18n/use-messages';

import type { FormView } from '../lib/form-view';
import type { CaptureSource } from '../schemas/measurement-set.schema';
import { MeasurementErrorSummary } from './MeasurementErrorSummary';
import { NoteSummary } from './NoteSummary';
import type { StudioFlow } from './studio-flow';

export interface MeasurementSummariesProps {
  /** Which garments each summary lists — see `formView`. */
  readonly view: FormView;
  readonly flow: StudioFlow;
  /** The way of measuring, which words the quiet summary's lead. */
  readonly source: CaptureSource;
}

/**
 * The two lists above the fields: what is WRONG, in red, and what is only worth a
 * second look, in its own quiet list — so the two are never mistaken for each
 * other. Each is drawn only while it lists something. Rendered inside
 * `MeasurementStudio`'s client boundary (MOD-06).
 */
export function MeasurementSummaries({ view, flow, source }: MeasurementSummariesProps) {
  const messages = useMessages();

  return (
    <>
      {view.errorGroups.length === 0 ? null : (
        <MeasurementErrorSummary
          groups={view.errorGroups}
          onJump={flow.jump}
          summaryRef={flow.measuring.summaryRef}
          messages={messages}
        />
      )}

      {view.noteGroups.length === 0 ? null : (
        <NoteSummary
          groups={view.noteGroups}
          onJump={flow.jump}
          summaryRef={flow.notes.summaryRef}
          messages={messages}
          outstanding={flow.notes.outstanding}
          source={source}
        />
      )}
    </>
  );
}
