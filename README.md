# UAD 3.6 Knowledge Wiki

Interactive knowledge wiki for the UAD 3.6 rollout to True Footage's nationwide
staff appraisers — Google Drive-backed resources, an FAQ/QDT review queue, and
a Gemini-grounded Q&A assistant.

Stack: Vite + React 19 + Express (single Node server serves the API and the
built SPA), Firebase Auth (Google sign-in, for Drive/Docs API scopes) and the
Gemini API (`@google/genai`).

## Run locally 

**Prerequisites:** Node.js 20+

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in `GEMINI_API_KEY` (and the
   other values if you're using Drive sync / NotebookLM).
3. `npm run dev`

## Deploy to Google Cloud Run 

Deploy config lives in [`Dockerfile`](Dockerfile) and
[`cloudbuild.yaml`](cloudbuild.yaml). One-time setup:

```bash
gcloud artifacts repositories create uad36-wiki-repo \
  --repository-format=docker --location=us-central1

gcloud secrets create GEMINI_API_KEY --data-file=- <<< "your-key-here"

# Grant the Cloud Run runtime service account access to the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Then, from Cloud Build (or `gcloud builds submit --config cloudbuild.yaml`):

```bash
gcloud builds submit --config cloudbuild.yaml
```

`cloudbuild.yaml` builds the image, pushes it to Artifact Registry, and
deploys to Cloud Run. Override `_LOCATION`, `_SERVICE_NAME`, `_AR_REPO`, or
`_ALLOWED_DOMAIN` via `--substitutions` if your project differs from the
defaults.

## Security & persistence (production)

Both of the earlier blockers are resolved. See
[`docs/DEPLOYMENT_RUNBOOK.md`](docs/DEPLOYMENT_RUNBOOK.md) for the required
one-time Google Cloud / Firebase console steps.

- **Identity is verified server-side.** Login uses real Firebase Google
  sign-in; the server verifies the Firebase **ID token**
  (`server/auth.ts`), enforces the `@truefootage.tech` domain, and grants
  admin only to the `ADMIN_EMAILS` allowlist. Every `/api` route requires a
  valid token; admin routes require an allowlisted admin. The old
  "type any email / any `admin@…` = admin" behavior is removed.
- **Storage is durable.** `server/db.ts` persists through `server/storage.ts`
  to **Firestore** (auto-detected on Cloud Run), with a local `data-store.json`
  fallback for dev. Grant the Cloud Run runtime service account the
  **Cloud Datastore User** role (see runbook §3).

### Local dev without Google

Set `DEV_AUTH=true` and `STORAGE_BACKEND=file` in `.env.local` to run entirely
offline (a dev login button appears, and data uses the local JSON file).
`DEV_AUTH` must never be set in production.
