/**
 * STRUCT-04 / STRUCT-06 — the public barrel.
 *
 * D3: this whole feature is the placeholder for architecture §11 Identity and
 * Access. The SHAPE is the real part — every action is the §11 operation it is
 * named after — so when the Java module lands, repointing the base URL and
 * deleting `lib/mocks/auth-db.ts` is the whole migration.
 */
export {
  readSession,
  requestCodeAction,
  requestPasswordResetAction,
  signInWithCodeAction,
  signInWithPasswordAction,
  signOutAction,
  signUpAction,
} from './actions';

export { AccountMenu } from './components/AccountMenu';
export { SessionProvider, useSession } from './components/SessionProvider';
export { PasswordResetForm } from './components/PasswordResetForm';
export { SignInScreen } from './components/SignInScreen';
export { SignUpForm } from './components/SignUpForm';

export {
  codeRequestSchema,
  codeSignInSchema,
  passwordResetSchema,
  passwordSignInSchema,
  sessionSchema,
  signUpSchema,
  type CodeRequestInput,
  type CodeSignInInput,
  type PasswordResetInput,
  type PasswordSignInInput,
  type Session,
  type SignUpInput,
} from './schemas/auth.schema';
