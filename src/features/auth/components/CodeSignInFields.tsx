'use client';

import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { Messages } from '@/i18n/messages/en';

import type { CodeSignIn } from '../hooks/use-code-sign-in';

export interface CodeSignInFieldsProps {
  flow: CodeSignIn;
  messages: Messages;
  mobileExample: string;
}

/**
 * The code sign-in's two fields: the number, and — once a code is on its way —
 * the code. The number stays on screen while the code is typed, so a mistyped
 * number can be seen and fixed without starting again.
 */
export function CodeSignInFields({ flow, messages, mobileExample }: CodeSignInFieldsProps) {
  const t = messages.auth;

  return (
    <>
      <Field id="mobile" label={t.mobileLabel} hint={mobileExample}>
        {(aria) => (
          <Input
            {...aria}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={flow.mobile}
            onChange={(event) => {
              flow.changeMobile(event.target.value);
            }}
          />
        )}
      </Field>

      {!flow.isSent ? null : (
        <Field
          id="code"
          label={t.codeLabel}
          hint={flow.devCode === null ? undefined : `${t.testCode}: ${flow.devCode}`}
        >
          {(aria) => (
            <Input
              {...aria}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={flow.code}
              onChange={(event) => {
                flow.changeCode(event.target.value);
              }}
            />
          )}
        </Field>
      )}
    </>
  );
}
