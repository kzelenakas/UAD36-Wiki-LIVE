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

## Known limitations — read before relying on this in production

- **Storage is not persistent on Cloud Run.** `server/db.ts` reads/writes a
  local `data-store.json` file. Cloud Run containers are stateless and can
  scale to zero or to multiple replicas that don't share a filesystem — data
  written by one request is not guaranteed to be there for the next one.
  `firebase` is already a dependency; migrating the data layer to Firestore
  is the natural fix and isn't done yet.
- **`/api/auth/login` does not verify identity.** The client-side Firebase
  Google sign-in (`src/lib/googleDocsExport.ts`) is only used to get an
  OAuth access token for Drive/Docs API calls. The role-granting login route
  in `server.ts` trusts whatever `email`/`displayName` the client POSTs — it
  does not check a Firebase ID token, so anyone can claim
  `admin@truefootage.tech` and receive `role: "admin"` in the response.
  Fix this (verify the Firebase ID token server-side with
  `getAuth().verifyIdToken()`) before this handles anything sensitive.
