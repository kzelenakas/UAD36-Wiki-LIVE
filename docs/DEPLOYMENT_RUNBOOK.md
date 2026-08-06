# UAD 3.6 Wiki — Deployment Runbook

This release makes the Wiki production-ready: real Google Workspace SSO, durable
Firestore storage, live Google Drive file sync, TFAN chat logging, and a linked
Google Sheet export. Several features call live Google APIs, so a few one-time
Google Cloud / Workspace console steps are required. This document lists exactly
what must be done and in what order.

> Legend: **[Code — done]** shipped in this repo · **[Console — you/IT]** a
> one-time action in Google Cloud / Firebase / Workspace · **[Test]** verify in a
> real browser.

---

## 0. What changed (summary)

- **Security (#2):** Login is now real Firebase Google sign-in. The server
  verifies the Firebase ID token, enforces the `@truefootage.tech` domain, and
  grants admin only to the `ADMIN_EMAILS` allowlist. Every `/api` route requires
  a valid token; admin routes require an allowlisted admin. The old "type any
  email / any `admin@…` = admin" behavior is gone.
- **Persistence (#3):** Data now lives in Firestore (auto-detected on Cloud Run),
  with a local-JSON fallback for dev. No more data loss on restart/scale.
- **Drive (#1/#3/#4/#5):** "Sync from Google Drive" reads the real resource
  folder's section subfolders using the signed-in admin's Google token; files
  preview and download correctly; re-syncing reflects source edits.
- **Folder safety (#6):** Editing the Resource Folder ID/Name requires a warning
  + explicit confirmation.
- **TFAN logging (#7):** Every TFAN chat question is logged (with the linked
  section, or "General"), reviewable in **FAQ → TFAN Log** (next to Review Queue).
- **Linked Sheet (#8):** Admin can create/refresh a Google Sheet in the resource
  folder with FAQ Log + TFAN Log tabs.

---

## 1. Firebase Authentication — authorize sign-in  **[Console — you/IT]**

Project: **uad-36-knowledge-base** (from `firebase-applet-config.json`).

1. Firebase console → **Authentication → Sign-in method** → enable **Google**.
2. **Authentication → Settings → Authorized domains** → add the Cloud Run
   service domain (e.g. `uad36-wiki-xxxxxxxx-uc.a.run.app`) and any custom domain.
   Without this the popup fails with `auth/unauthorized-domain`.
3. (Recommended) In the Google Cloud **OAuth consent screen** for this project,
   set User Type = **Internal** so only `@truefootage.tech` accounts can consent,
   and add the scopes below.

**[Test]** Open the app, click *Sign in with Google Workspace*, confirm a
`@truefootage.tech` account gets in and a non-domain account is rejected.

---

## 2. OAuth scopes for Drive / Sheets / Docs  **[Console — you/IT]**

The browser calls Drive/Sheets/Docs directly with the signed-in user's token.
On the OAuth consent screen add (or confirm) these scopes:

- `https://www.googleapis.com/auth/drive`
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/documents`

Enable the corresponding APIs in **APIs & Services → Library**: **Google Drive
API**, **Google Sheets API**, **Google Docs API**.

For an Internal app admins can pre-authorize these scopes org-wide (Admin console
→ Security → API controls) so staff aren't prompted individually.

---

## 3. Firestore  **[Console — you/IT]**

1. In project **uad-36-knowledge-base**: **Firestore → Create database**
   (Native mode, pick the region matching Cloud Run, e.g. `us-central1`).
2. Grant the **Cloud Run runtime service account** the role **Cloud Datastore
   User** (`roles/datastore.user`). Cloud Run → service → *Security* shows which
   service account it runs as. This lets the app read/write Firestore via ADC —
   no key file needed.
3. Deploy in the **same GCP project** as Firebase, or set `FIREBASE_PROJECT_ID`
   to `uad-36-knowledge-base` (already set in `cloudbuild.yaml`).

If Firestore is unreachable the app logs a warning and falls back to the local
file store (data will not persist across instances) — so verify the role.

---

## 4. Share the Drive resource folder  **[Console — you/IT]**

Folder ID: **1E7_DywyR2785lgZCNs8ZfvYmFi10r-6F**.

- Share it with the staff/admins who will use the Wiki (at least Viewer; admins
  who run sync/auto-create/sheet export need Editor).
- In the app: **Admin → Wiki Sections → Auto-create subfolders in Drive** creates
  one subfolder per Wiki section (names matched automatically). Drop files into
  the matching section subfolder, then **Admin → Google Drive & Sync → Sync from
  Google Drive**.

**[Test]** Drop a doc in a section subfolder → Sync → confirm it appears in that
section and previews/downloads.

---

## 5. Environment variables  **[Console — you/IT]**

Set on the Cloud Run service (defaults are in `cloudbuild.yaml` substitutions):

| Var | Value | Purpose |
|-----|-------|---------|
| `ALLOWED_DOMAIN` | `truefootage.tech` | Login domain gate |
| `ADMIN_EMAILS` | comma-separated | Admin allowlist |
| `DRIVE_FOLDER_ID` | `1E7_Dywy…-6F` | Resource folder |
| `FIREBASE_PROJECT_ID` | `uad-36-knowledge-base` | Token verify + Firestore |
| `GEMINI_API_KEY` | secret | Live TFAN answers (optional; simulated if unset) |
| `DEV_AUTH` | **unset** | MUST NOT be set in prod |

---

## 6. Deploy

`cloudbuild.yaml` already builds the image, pushes to Artifact Registry, and
deploys to Cloud Run with the env vars above. Trigger via your existing Cloud
Build trigger on the `UAD36-Wiki-LIVE` repo, or `gcloud builds submit`.

---

## 7. Post-deploy verification  **[Test]**

1. Sign in with a `@truefootage.tech` Google account → admin sees Admin Console.
2. Sign in (or simulate) a non-admin domain account → no Admin tab; admin API
   calls return 403.
3. Hit an `/api` route with no session → 401 (open an incognito window to the
   service URL; the SPA should force login).
4. Edit a FAQ, restart/redeploy the service, confirm the edit persists (Firestore).
5. Auto-create subfolders → drop a file → Sync → preview + download work.
6. Ask a TFAN question → appears in **FAQ → TFAN Log** with the right section.
7. **Create linked Sheet** in System Config → open it → FAQ Log + TFAN Log tabs.

---

## 8. Notes / follow-ups

- **Break-glass:** keep at least one known-good address in `ADMIN_EMAILS` so you
  can't lock yourself out. To regain access without Google in an emergency, you
  can temporarily set `DEV_AUTH=true` on the service (then unset it).
- The linked Sheet and background Drive sync run under the **signed-in admin's**
  Google token (per the chosen design). They work on-demand while an admin is
  signed in. If you later want fully unattended 24/7 sync / a Drive push webhook,
  that requires a dedicated service account — a future enhancement.
- The client bundle is ~520 kB (one chunk). Not a blocker; can be code-split later.
