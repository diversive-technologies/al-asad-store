/**
 * STRUCT-04 / STRUCT-06 — the public barrel.
 *
 * Architecture §11 Identity and Access. Every action is the §11 operation it is
 * named after and is answered by the Java service; D3's session cookie is the
 * part still standing in for a session Java issues.
 */
export {
  confirmPasswordResetAction,
  readSession,
  requestCodeAction,
  requestPasswordResetAction,
  signInWithCodeAction,
  signInWithPasswordAction,
  signOutAction,
  signUpAction,
} from './actions';

export { accountKeyOf } from './account-key';

export { AccountIdentity } from './components/AccountIdentity';
export { AccountMenu } from './components/AccountMenu';
export { SessionProvider, useSession } from './components/SessionProvider';
export { PasswordResetConfirmForm } from './components/PasswordResetConfirmForm';
export { PasswordResetForm } from './components/PasswordResetForm';
export { ResetLinkExpired } from './components/ResetLinkExpired';
export { SignInScreen } from './components/SignInScreen';
export { SignUpForm } from './components/SignUpForm';

export {
  codeRequestSchema,
  codeSignInSchema,
  passwordResetConfirmSchema,
  passwordResetSchema,
  passwordSignInSchema,
  resetTokenSchema,
  sessionSchema,
  signUpSchema,
  type CodeRequestInput,
  type CodeSignInInput,
  type NewPasswordInput,
  type PasswordResetConfirmInput,
  type PasswordResetInput,
  type PasswordSignInInput,
  type Session,
  type SignUpInput,
} from './schemas/auth.schema';
