import { useState, type ChangeEvent, type ReactNode } from 'react';

import { LoadingNotice } from '@/components/shared/LoadingNotice';
import { OnDemand } from '@/components/shared/OnDemand';
import { onDemandPart } from '@/hooks/use-on-demand';
import type { UseObjectUrlResult } from '@/hooks/use-object-url';
import { useMessages } from '@/i18n/use-messages';

import { SegmentedChoice } from './SegmentedChoice';

type View = 'NOTE' | 'DRAWING';

/*
 * Deliberate code split (IMP-01a, PERF-06, PERF-10): the photo view — and with
 * it `next/image`, which nothing else on the studio's first paint draws — exists
 * only once a photo has been chosen on this device, so a page can never open on
 * it. It is fetched when the customer reaches for the picker and drawn when a
 * photo is in hand; a download that fails says so in its place with Try again,
 * and the drawing is one press away (`useOnDemand`).
 */
const photoView = onDemandPart(() => import('./CardNotePhoto'));

export interface CardNoteProps {
  /** The photo in hand — held by the studio, so it survives a switch of style or path. */
  readonly photo: UseObjectUrlResult;
  /** The drawing, shown until a photo is chosen and whenever it is asked for. */
  readonly children: ReactNode;
}

/**
 * A photo of the tailor's card beside the form while the customer copies it —
 * picked on the device and shown from the device (plan Phase 4).
 *
 * It is NEVER sent. It is not in the form, no field holds it and no request
 * carries it: a photograph of a document is a customer photograph (§24, §34.7,
 * A2-13), and a note carries other people's names and numbers. The page says so
 * under the picker. The studio holds it (`useObjectUrl`) until the page closes;
 * in focus mode the picker gives its room to the photo.
 */
export function CardNote({ photo, children }: CardNoteProps) {
  const t = useMessages().madeToMeasure;
  const { url } = photo;
  const [view, setView] = useState<View>(url === null ? 'DRAWING' : 'NOTE');

  function choose(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    photo.hold(file);
    setView('NOTE');
  }

  return (
    <div className="mm-card-note">
      <div className="mm-card-note-controls flex flex-col gap-1">
        <label
          onPointerEnter={photoView.warm}
          onTouchStart={photoView.warm}
          className="mm-review-change has-[:focus-visible]:ring-brand-500 self-start has-[:focus-visible]:rounded-sm has-[:focus-visible]:ring-2"
        >
          <input
            type="file"
            accept="image/*"
            onChange={choose}
            onFocus={photoView.warm}
            className="sr-only"
          />
          {url === null ? t.noteChoose : t.noteReplace}
        </label>
        <p className="text-fg-muted text-xs">{t.notePrivacy}</p>
      </div>

      {url === null ? null : (
        <SegmentedChoice
          legend={t.noteViewLabel}
          name="card-note-view"
          options={[
            { value: 'NOTE', label: t.noteViewNote },
            { value: 'DRAWING', label: t.noteViewDrawing },
          ]}
          value={view}
          onChange={setView}
        />
      )}

      {url !== null && view === 'NOTE' ? (
        <OnDemand key={url} part={photoView} loading={<LoadingNotice />}>
          {(loaded) => <loaded.CardNotePhoto url={url} />}
        </OnDemand>
      ) : (
        children
      )}
    </div>
  );
}
