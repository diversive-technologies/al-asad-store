import { useState, type ChangeEvent, type ReactNode } from 'react';

import Image from 'next/image';

import type { UseObjectUrlResult } from '@/hooks/use-object-url';
import { useMessages } from '@/i18n/use-messages';

import { SegmentedChoice } from './SegmentedChoice';

type View = 'NOTE' | 'DRAWING';

interface NotePhotoProps {
  readonly url: string;
}

/*
 * The photo, fitted — or, pressed, at twice the width to pan across, because a
 * whole card at phone size is too small to copy from. A photo the browser cannot
 * show (an iPhone's HEIC, on a desktop) says so instead of a broken image.
 */
function NotePhoto({ url }: NotePhotoProps) {
  const t = useMessages().madeToMeasure;
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <p role="alert" className="text-danger-500 text-sm">
        {t.noteUnreadable}
      </p>
    );
  }

  return (
    <div className="mm-card-note-frame" data-zoomed={zoomed ? '' : undefined}>
      <button
        type="button"
        className="mm-card-note-zoom"
        aria-pressed={zoomed}
        aria-label={t.noteZoomIn}
        onClick={() => {
          setZoomed((current) => !current);
        }}
      >
        <Image
          src={url}
          alt={t.noteAlt}
          width={1200}
          height={1600}
          unoptimized
          onError={() => {
            setFailed(true);
          }}
          className="mm-card-note-photo"
        />
      </button>
    </div>
  );
}

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
  const [view, setView] = useState<View>(photo.url === null ? 'DRAWING' : 'NOTE');

  function choose(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    photo.hold(file);
    setView('NOTE');
  }

  return (
    <div className="mm-card-note">
      <div className="mm-card-note-controls flex flex-col gap-1">
        <label className="mm-review-change self-start has-[:focus-visible]:ring-brand-500 has-[:focus-visible]:rounded-sm has-[:focus-visible]:ring-2">
          <input type="file" accept="image/*" onChange={choose} className="sr-only" />
          {photo.url === null ? t.noteChoose : t.noteReplace}
        </label>
        <p className="text-fg-muted text-xs">{t.notePrivacy}</p>
      </div>

      {photo.url === null ? null : (
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

      {photo.url !== null && view === 'NOTE' ? <NotePhoto key={photo.url} url={photo.url} /> : children}
    </div>
  );
}
