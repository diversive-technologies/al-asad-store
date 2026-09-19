'use client';

import { useRef, useState, type ComponentType, type FormEvent } from 'react';

import { useMessages } from '@/i18n/use-messages';

import { NO_HANDOFF, type NewsletterHandoff } from '../lib/handoff';
import type { NewsletterFormProps } from './NewsletterForm';
import { NewsletterFields } from './NewsletterFields';

/*
 * Deliberate code split (IMP-01a, PERF-06, PERF-10). The newsletter form sits in
 * the footer of EVERY route, and with it came React Hook Form — about 10 kB
 * gzipped, the largest package the layout carried after the framework — to
 * every page, although most visits never type an address. So the footer first
 * draws the same form without its state, and the form itself is fetched when
 * the customer reaches for it: a pointer over it, a touch, focus inside it.
 * Focusing the field also starts the validation's download, as the form does.
 */
const loadForm = () => import('./NewsletterForm');
const loadValidation = () => import('../hooks/use-newsletter-subscribe');

/* Starts the validation's download beside the form's. A failure is dropped here
   (DATA-03): the form asks for it again when it is sent, and the action checks
   the address whatever happens (`onDemandResolver` has the reasoning). */
function warmValidation(): void {
  void loadValidation().then(
    (module) => {
      module.warmNewsletterValidation();
    },
    () => undefined,
  );
}

/**
 * Section 28.4's newsletter capture as the footer mounts it: the stand-in until
 * the form has arrived, then the form.
 *
 * The swap is made only where nobody can feel it. Untouched, the form takes over
 * the moment it arrives, usually before the pointer that fetched it has clicked.
 * Once the field has been focused, the stand-in keeps it — replacing a field
 * under a finger closes a phone's keyboard, and a click on a button that is
 * replaced mid-press is lost — until Subscribe is pressed. Then the form takes
 * over with what was typed, puts focus back on the field and sends that press
 * itself (`NewsletterForm`), so the check and the action are the form's as they
 * always were (FORM-02). Until it arrives the button is busy, and a second press
 * is held off by a latch (FORM-06); a form that cannot be downloaded says so.
 */
export function NewsletterSignup() {
  const t = useMessages();
  const inputRef = useRef<HTMLInputElement>(null);
  const isSending = useRef(false);
  const [Form, setForm] = useState<ComponentType<NewsletterFormProps> | null>(null);
  const [isTouched, setIsTouched] = useState(false);
  const [handoff, setHandoff] = useState<NewsletterHandoff | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // DATA-03: a download that fails is a value, never a rejection.
  function fetchForm(): Promise<boolean> {
    return loadForm().then(
      (module) => {
        setForm(() => module.NewsletterForm);
        return true;
      },
      () => false,
    );
  }

  function touch(): void {
    setIsTouched(true);
    warmValidation();
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (isSending.current) return;
    isSending.current = true;
    setFailure(null);
    setHandoff({
      email: inputRef.current?.value ?? '',
      wantsSubmit: true,
      hadFocus: event.currentTarget.contains(document.activeElement),
    });
    void fetchForm().then((hasArrived) => {
      if (hasArrived) return;
      isSending.current = false;
      setHandoff(null);
      setFailure(t.errors.network);
    });
  }

  if (Form !== null && (!isTouched || handoff !== null)) {
    return <Form handoff={handoff ?? NO_HANDOFF} />;
  }

  return (
    <NewsletterFields
      field={{ ref: inputRef, name: 'email', onFocus: touch }}
      onSubmit={submit}
      isSubmitting={handoff !== null}
      isInvalid={false}
      failure={failure}
      onReach={() => {
        void fetchForm();
      }}
    />
  );
}
