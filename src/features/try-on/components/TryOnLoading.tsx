'use client';

import Image from 'next/image';

import type { Messages } from '@/i18n/messages/en';

export interface TryOnLoadingProps {
  /** The customer's chosen photo, kept on screen while it is worked on. */
  previewUrl: string;
  messages: Messages;
}

/**
 * The waiting state, and the reason it is a whole component rather than a
 * spinner in a button.
 *
 * A generation runs for tens of seconds. Over that long, a spinner stops
 * reading as "working" and starts reading as "hung" — so this shows THREE
 * things instead: the customer's own photograph, still on screen and visibly
 * being worked on; an indeterminate bar, because the duration genuinely cannot
 * be known; and captions naming the stage, which crossfade on a six-second
 * cycle.
 *
 * All of it is CSS keyframes (`try-on-develop`, `try-on-sweep`,
 * `try-on-progress`, `try-on-phase` in globals.css). There is no timer, no
 * interval and no phase state — the captions are sequenced purely by three
 * offset animation delays, which is why this costs the bundle nothing and
 * cannot drift out of step with itself.
 *
 * The captions are `aria-hidden` deliberately. They are decoration over a
 * single unchanging fact, and pushing three rotating strings through a live
 * region would interrupt a screen-reader user every two seconds for the length
 * of the wait. The one spoken announcement is the status line in the panel.
 */
export function TryOnLoading({ previewUrl, messages }: TryOnLoadingProps) {
  const t = messages.tryOn;

  return (
    <div className="flex flex-col gap-4">
      <div className="try-on-stage mx-auto aspect-4/5 h-56">
        {/* An object URL has no origin to optimise, and the file it pins never
            leaves the browser on this path. */}
        <Image
          src={previewUrl}
          alt={t.chosenAlt}
          fill
          unoptimized
          className="try-on-develop object-cover"
        />
        <div className="try-on-sweep" aria-hidden />
      </div>

      <div className="flex flex-col gap-2">
        <div className="try-on-progress" aria-hidden>
          <div className="try-on-progress-bar" />
        </div>

        <div className="try-on-phases text-center" aria-hidden>
          <span className="try-on-phase text-fg text-sm">{t.phaseReading}</span>
          <span className="try-on-phase try-on-phase-2 text-fg text-sm">{t.phaseColour}</span>
          <span className="try-on-phase try-on-phase-3 text-fg text-sm">{t.phasePlacing}</span>
        </div>
      </div>
    </div>
  );
}
