/**
 * Shared firebase-admin initialisation.
 *
 * Used by both the Firestore storage backend and server-side auth (Firebase ID
 * token verification). Initialises a single default admin app.
 *
 * On Cloud Run this picks up Application Default Credentials (the runtime
 * service account) automatically. Locally, if no credentials are present the
 * app still initialises with an explicit projectId — that is enough for
 * `auth().verifyIdToken()` (which only needs Google's public certs), though
 * Firestore access will require real credentials.
 */

let adminModule: any = null;
let initTried = false;
let initOk = false;

export async function getAdmin(): Promise<any | null> {
  if (initTried) return initOk ? adminModule : null;
  initTried = true;
  try {
    const admin = await import('firebase-admin');
    if (!admin.apps || admin.apps.length === 0) {
      const projectId =
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT ||
        'uad-36-knowledge-base';
      admin.initializeApp({ projectId });
    }
    adminModule = admin;
    initOk = true;
    return adminModule;
  } catch (e) {
    console.warn('[firebaseAdmin] init failed:', (e as Error).message);
    initOk = false;
    return null;
  }
}
