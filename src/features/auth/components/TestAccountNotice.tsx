import type { Messages } from '@/i18n/messages/en';

export interface TestAccountNoticeProps {
  messages: Messages;
  hint: { email: string; password: string };
}

/**
 * D3, said plainly on the screen rather than only in a comment. This is the
 * placeholder for §11, and anyone testing should know the account is seeded
 * rather than wondering why their real details fail. The page draws it only while
 * the mock layer is armed.
 */
export function TestAccountNotice({ messages, hint }: TestAccountNoticeProps) {
  const t = messages.auth;

  return (
    <div className="rounded-card border-border bg-surface-muted mt-6 border p-3 text-xs">
      <p className="text-fg font-medium">{t.testAccountHeading}</p>
      <p className="text-fg-muted mt-1">
        {t.testAccountEmail}: <code>{hint.email}</code>
      </p>
      <p className="text-fg-muted">
        {t.testAccountPassword}: <code>{hint.password}</code>
      </p>
    </div>
  );
}
