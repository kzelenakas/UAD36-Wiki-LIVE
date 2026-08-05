/**
 * Server-side authentication & authorization (issue #2).
 *
 * The previous implementation trusted whatever email a user typed, as long as
 * the domain string matched — no identity check, and any email containing
 * "admin" was silently granted admin. That is removed here.
 *
 * New model:
 *   - The client signs in with real Firebase Google sign-in and sends the
 *     Firebase ID token as `Authorization: Bearer <token>`.
 *   - We verify that token with firebase-admin (cryptographically validated
 *     against Google's public certs), confirm the email is verified and on the
 *     allowed Workspace domain, and derive the role from an explicit allowlist.
 *
 * A DEV_AUTH escape hatch allows local development without Google, but it is
 * OFF by default so production can never fall open.
 */

import { Request, Response, NextFunction } from 'express';
import { getAdmin } from './firebaseAdmin';

export interface AuthedUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'staff';
  domain: string;
}

const ALLOWED_DOMAIN = (process.env.ALLOWED_DOMAIN || 'truefootage.tech').toLowerCase();

// Explicit admin allowlist. Comma-separated emails in ADMIN_EMAILS, plus a
// safe default so the owner is never locked out. NO string-matching backdoor.
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || 'kevin.zelenakas@truefootage.tech')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

const DEV_AUTH = process.env.DEV_AUTH === 'true';

function roleFor(email: string): 'admin' | 'staff' {
  return ADMIN_EMAILS.has(email.toLowerCase()) ? 'admin' : 'staff';
}

function domainOf(email: string): string {
  return (email.split('@')[1] || '').toLowerCase();
}

/**
 * Verify a Firebase ID token and return a normalised user, or null if invalid /
 * not on the allowed domain.
 */
export async function verifyToken(idToken: string): Promise<AuthedUser | null> {
  const admin = await getAdmin();
  if (!admin) {
    console.error('[auth] firebase-admin unavailable; cannot verify token.');
    return null;
  }
  let decoded: any;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (e) {
    console.warn('[auth] Token verification failed:', (e as Error).message);
    return null;
  }

  const email = (decoded.email || '').toLowerCase();
  if (!email || decoded.email_verified === false) return null;
  if (domainOf(email) !== ALLOWED_DOMAIN) return null;

  return {
    uid: decoded.uid,
    email,
    displayName: decoded.name || email.split('@')[0],
    role: roleFor(email),
    domain: domainOf(email)
  };
}

/**
 * Resolve the requesting user from the Authorization header (or, only when
 * DEV_AUTH is enabled, from a dev email header/body). Returns null if the
 * caller is not authenticated.
 */
export async function resolveUser(req: Request): Promise<AuthedUser | null> {
  const header = req.headers['authorization'] || '';
  const match = Array.isArray(header) ? header[0] : header;
  const token = match.startsWith('Bearer ') ? match.slice(7).trim() : '';

  if (token) {
    return verifyToken(token);
  }

  if (DEV_AUTH) {
    const devEmail = (
      (req.headers['x-dev-email'] as string) ||
      (req.body && req.body.devEmail) ||
      ''
    )
      .toString()
      .trim()
      .toLowerCase();
    if (devEmail && domainOf(devEmail) === ALLOWED_DOMAIN) {
      return {
        uid: `dev-${devEmail}`,
        email: devEmail,
        displayName: devEmail.split('@')[0],
        role: roleFor(devEmail),
        domain: domainOf(devEmail)
      };
    }
  }

  return null;
}

// Express middleware: any authenticated Workspace user.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await resolveUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in with your True Footage Google account.' });
  }
  (req as any).authUser = user;
  next();
}

// Express middleware: authenticated AND on the admin allowlist.
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = await resolveUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required.' });
  }
  (req as any).authUser = user;
  next();
}

export { ALLOWED_DOMAIN, DEV_AUTH };
