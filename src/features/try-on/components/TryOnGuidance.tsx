import type { Messages } from '@/i18n/messages/en';

export interface TryOnGuidanceProps {
  messages: Messages;
}

/**
 * §28.5's "guidance screens", and the privacy note that has to sit beside them.
 *
 * Deliberately terse. This lives inside a centred dialog roughly 28rem wide,
 * shown only until a photograph is chosen, and four short lines are read where
 * four paragraphs are skipped — at which point the guidance may as well not be
 * there.
 *
 * The privacy note is not boilerplate. §24 makes "no customer photograph is
 * written to storage, backup or log" an invariant of the system, and someone
 * being asked to upload a photograph of themselves to a clothing shop is
 * entitled to be told that BEFORE they choose the file rather than after.
 */
export function TryOnGuidance({ messages }: TryOnGuidanceProps) {
  const t = messages.tryOn;

  return (
    <div className="flex flex-col gap-2">
      <section aria-labelledby="try-on-guidance-heading">
        <h3 id="try-on-guidance-heading" className="text-fg mb-1 text-xs font-medium">
          {t.guidanceHeading}
        </h3>

        <ul className="text-fg-muted flex list-disc flex-col gap-0.5 ps-4 text-xs">
          <li>{t.guidanceFraming}</li>
          <li>{t.guidanceLight}</li>
          <li>{t.guidanceClothes}</li>
          <li>{t.guidanceAlone}</li>
        </ul>
      </section>

      <p className="text-fg-muted text-xs">
        <span className="text-fg">{t.privacyHeading}: </span>
        {t.privacyNote}
      </p>
    </div>
  );
}
