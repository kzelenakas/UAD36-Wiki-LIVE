/**
 * Client-side authentication (issue #2).
 *
 * Owns the single Firebase app/auth instance and real Google Workspace
 * sign-in. Provides:
 *   - googleSignIn(): real Google popup, returns the Firebase user + a Google
 *     OAuth access token (used for direct Drive/Sheets/Docs API calls).
 *   - getIdToken(): the auto-refreshing Firebase ID token, sent to our server
 *     for identity verification.
 *   - installAuthFetch(): patches window.fetch to attach the ID token to every
 *     same-origin /api request, so all existing fetch call-sites become
 *     authenticated without individual changes.
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Scopes needed across the app: read/write the resource Drive folder, create
// the linked log Sheet, and the QDT Doc export.
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/documents');
// Hint the Workspace domain and always let the user pick the right account.
provider.setCustomParameters({ hd: 'truefootage.tech', prompt: 'select_account' });

let cachedAccessToken: string | null = null;

export type { User };

export const subscribeAuth = (cb: (user: User | null) => void) =>
  onAuthStateChanged(auth, cb);

export const getCurrentUser = (): User | null => auth.currentUser;

/** Auto-refreshing Firebase ID token for server-side verification. */
export const getIdToken = async (forceRefresh = false): Promise<string | null> => {
  if (!auth.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken(forceRefresh);
  } catch (e) {
    console.error('getIdToken error', e);
    return null;
  }
};

/** Google OAuth access token for direct Drive/Sheets/Docs API calls. */
export const getAccessToken = (): string | null => cachedAccessToken;

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Failed to retrieve Google access token.');
  }
  cachedAccessToken = credential.accessToken;
  return { user: result.user, accessToken: cachedAccessToken };
};

export const signOutUser = async (): Promise<void> => {
  cachedAccessToken = null;
  try {
    await signOut(auth);
  } catch (e) {
    console.error('signOut error', e);
  }
};

let interceptorInstalled = false;

/** Patch window.fetch once so all /api requests carry the ID token. */
export const installAuthFetch = (): void => {
  if (interceptorInstalled || typeof window === 'undefined') return;
  interceptorInstalled = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    try {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.toString()
          : input instanceof Request
          ? input.url
          : String(input);

      const isApi = url.startsWith('/api') || url.includes(`${window.location.origin}/api`);
      if (isApi) {
        const token = await getIdToken();
        if (token) {
          const headers = new Headers(
            init.headers || (input instanceof Request ? input.headers : undefined)
          );
          headers.set('Authorization', `Bearer ${token}`);
          init = { ...init, headers };
        }
      }
    } catch (e) {
      // Never let auth wiring break a request; fall through unmodified.
    }
    return originalFetch(input as any, init);
  };
};
