/**
 * §34 Made-to-Measure — the SERVER-facing barrel.
 *
 * `StitchedScreen` and the profile calls read and write the backend through
 * `apiRequest`, which is server-only, so a Client Component must not import this
 * file. The static, client-safe surface is `contract.ts` (STRUCT-06).
 */
export { StitchedScreen } from './components/StitchedScreen';
export { StudioSkeleton } from './components/StudioSkeleton';
export { requestedSource, requestedStyle } from './lib/studio-params';

// §34.4 `validate` and `saveProfile`, for the BFF routes.
export { checkMeasurements } from './api/profile-server';
export { saveForCustomer } from './api/save-for-customer';
export { measurementSubmissionSchema } from './schemas/profile.schema';
