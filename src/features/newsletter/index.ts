/** STRUCT-04 / STRUCT-06 — the public barrel for the Newsletter feature. */
export { subscribeToNewsletterAction } from './actions';
export { NewsletterForm } from './components/NewsletterForm';
export {
  newsletterSubscribeSchema,
  newsletterSubscriptionSchema,
  type NewsletterSubscribeInput,
  type NewsletterSubscription,
} from './schemas/newsletter.schema';
