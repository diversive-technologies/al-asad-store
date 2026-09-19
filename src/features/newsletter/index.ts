/** STRUCT-04 / STRUCT-06 — the public barrel for the Newsletter feature. */
export { subscribeToNewsletterAction } from './actions';
/*
 * The footer's entry, not the form: `NewsletterForm` carries React Hook Form and
 * is downloaded on demand by `NewsletterSignup` (PERF-10), so it is not exported.
 */
export { NewsletterSignup } from './components/NewsletterSignup';
export {
  newsletterSubscribeSchema,
  newsletterSubscriptionSchema,
  type NewsletterSubscribeInput,
  type NewsletterSubscription,
} from './schemas/newsletter.schema';
