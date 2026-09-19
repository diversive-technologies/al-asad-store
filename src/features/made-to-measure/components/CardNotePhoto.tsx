import { useState } from 'react';

import Image from 'next/image';

import { useMessages } from '@/i18n/use-messages';

export interface CardNotePhotoProps {
  /** The photo's `blob:` address on this device — never uploaded (`CardNote`). */
  readonly url: string;
}

/**
 * The customer's photo of their tailor's card, fitted — or, pressed, at twice
 * the width to pan across, because a whole card at phone size is too small to
 * copy from. A photo the browser cannot show (an iPhone's HEIC, on a desktop)
 * says so instead of a broken image.
 *
 * Its own module so that `next/image` is downloaded only once a photo has been
 * chosen (`CardNote` has the reasoning); rendered inside the studio's client
 * boundary, so it needs no directive (MOD-06).
 */
export function CardNotePhoto({ url }: CardNotePhotoProps) {
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
