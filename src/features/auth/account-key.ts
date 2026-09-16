import type { Session } from './schemas/auth.schema';

/**
 * How an account is NAMED to the backend, while D3 stands in for §11.
 *
 * §11 offers two ways in and a customer may have used either, so the key is the
 * email when there is one and the mobile otherwise — a customer who signed in by
 * code has no email, and keying them by an empty string would put every such
 * customer in one shared account.
 *
 * It lives here, alone, because two features now ask the question: measurement
 * profiles and saved items both belong to whoever is signed in, and two copies of
 * this rule would be two places for it to drift (PD-01). When §11 issues a real
 * session the BFF forwards that instead and Java resolves the customer from it —
 * at which point this function is the one thing that has to go.
 */
export function accountKeyOf(session: Session): string {
  return session.email.length > 0 ? session.email : session.mobile;
}
