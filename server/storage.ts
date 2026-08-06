/**
 * Storage backend abstraction.
 *
 * Persists the whole application data-store either to Google Firestore
 * (production / deployment-ready) or to a local JSON file (developer machines
 * with no Google credentials). The choice is automatic:
 *
 *   - If firebase-admin can initialise with Application Default Credentials
 *     (i.e. running on Cloud Run, or GOOGLE_APPLICATION_CREDENTIALS is set),
 *     Firestore is used.
 *   - Otherwise it transparently falls back to the local JSON file so the app
 *     still runs in local dev.
 *
 * You can force one backend with the STORAGE_BACKEND env var
 * ("firestore" | "file").
 *
 * The whole store is kept as a single Firestore document
 * (collection "app_state", doc "wiki") to keep the migration simple and the
 * read/write model identical to the previous single-file JSON store. For an
 * internal tool with a handful of admins this is more than adequate and avoids
 * a risky per-collection rewrite.
 */

import fs from 'fs';
import path from 'path';
import { getAdmin } from './firebaseAdmin';

export interface RawStore {
  [key: string]: any;
}

const FILE_PATH = path.join(process.cwd(), 'data-store.json');
const FIRESTORE_COLLECTION = 'app_state';
const FIRESTORE_DOC = 'wiki';

type Backend = 'firestore' | 'file';

let backend: Backend = 'file';
let firestoreDb: any = null;
let initialised = false;

async function tryInitFirestore(): Promise<boolean> {
  const forced = (process.env.STORAGE_BACKEND || '').toLowerCase();
  if (forced === 'file') return false;

  const hasCreds =
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    !!process.env.GCLOUD_PROJECT ||
    !!process.env.GOOGLE_CLOUD_PROJECT ||
    !!process.env.K_SERVICE || // Cloud Run injects K_SERVICE
    forced === 'firestore';

  if (!hasCreds) return false;

  try {
    const admin = await getAdmin();
    if (!admin) return false;
    firestoreDb = admin.firestore();
    // Best-effort connectivity check.
    await firestoreDb.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC).get();
    return true;
  } catch (e) {
    console.warn(
      '[storage] Firestore unavailable, falling back to local file store:',
      (e as Error).message
    );
    firestoreDb = null;
    return false;
  }
}

export async function initStorage(): Promise<Backend> {
  if (initialised) return backend;
  const forced = (process.env.STORAGE_BACKEND || '').toLowerCase();
  const ok = await tryInitFirestore();
  if (!ok && forced === 'firestore') {
    // Production forces Firestore so a transient init failure can NEVER silently
    // fall back to the ephemeral file store. That fallback resets on every deploy
    // and is what made documents + config look "wiped". Fail loudly instead — the
    // old revision keeps serving until Firestore is reachable again.
    throw new Error(
      'STORAGE_BACKEND=firestore but Firestore could not be initialised. ' +
      'Refusing to fall back to the ephemeral file store (would lose data on deploy). ' +
      'Check the runtime service account has roles/datastore.user and the Firestore database exists.'
    );
  }
  backend = ok ? 'firestore' : 'file';
  initialised = true;
  console.log(`[storage] Using ${backend} backend for the data store.`);
  return backend;
}

export function activeBackend(): Backend {
  return backend;
}

export async function loadStore(): Promise<RawStore | null> {
  if (backend === 'firestore' && firestoreDb) {
    const snap = await firestoreDb
      .collection(FIRESTORE_COLLECTION)
      .doc(FIRESTORE_DOC)
      .get();
    if (!snap.exists) return null;
    return snap.data() as RawStore;
  }
  // file backend
  try {
    if (fs.existsSync(FILE_PATH)) {
      return JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('[storage] Error reading local data store:', e);
  }
  return null;
}

export async function saveStore(data: RawStore): Promise<void> {
  if (backend === 'firestore' && firestoreDb) {
    try {
      await firestoreDb
        .collection(FIRESTORE_COLLECTION)
        .doc(FIRESTORE_DOC)
        .set(data, { merge: false });
      return;
    } catch (e) {
      console.error('[storage] Firestore write failed:', e);
      throw e;
    }
  }
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('[storage] Error writing local data store:', e);
  }
}
