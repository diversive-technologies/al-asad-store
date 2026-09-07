/**
 * STRUCT-04 / STRUCT-06 — the public barrel.
 *
 * D3: this whole feature is the placeholder sign-in. When the real Identity
 * module (section 11) lands, deleting this directory and repointing this
 * barrel's consumers is the whole migration.
 */
export { readSession, signInAction } from './actions';
export { SessionProvider, useSession } from './components/SessionProvider';
export { SignInForm } from './components/SignInForm';
export {
  sessionSchema,
  signInSchema,
  type Session,
  type SignInInput,
} from './schemas/sign-in.schema';
