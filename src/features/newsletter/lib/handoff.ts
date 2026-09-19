/**
 * What the footer's stand-in held at the moment the newsletter form took its
 * place (`NewsletterSignup`). Its own module, with no React Hook Form in it, so
 * the stand-in can name it without downloading the form.
 */
export interface NewsletterHandoff {
  /** The address typed so far, carried so that nothing typed is lost. */
  readonly email: string;
  /** Subscribe was pressed on the stand-in, so the form sends that press, once, on arrival. */
  readonly wantsSubmit: boolean;
  /** Focus was inside the stand-in, so it goes back to the field instead of falling to the page. */
  readonly hadFocus: boolean;
}

/** The form arrived before the stand-in was touched: there is nothing to carry. */
export const NO_HANDOFF: NewsletterHandoff = { email: '', wantsSubmit: false, hadFocus: false };
