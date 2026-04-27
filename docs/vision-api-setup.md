# Google Cloud Vision API — Setup Guide

This guide walks you through enabling **Google Cloud Vision API** on the
shared `alchemyai-2ff0a` Google Cloud project so the `/api/scan` endpoint
can run real OCR against bottle labels.

You only need to do this once **per Google Cloud project**, not per
developer. If a teammate has already done this for `alchemyai-2ff0a`,
skip to [Per-developer setup](#per-developer-setup).

---

## What you'll set up

* Upgrade the Firebase project to the **Blaze (pay-as-you-go) plan** — required to use any GCP API beyond the Spark free tier.
* Enable the **Cloud Vision API**.
* Grant the existing Firebase Admin service account a **Cloud Vision** role so it can call the Vision API in addition to verifying Firebase ID tokens.

> **Cost note:** Cloud Vision API has a free tier of **1,000 requests per
> month**. For demo and development scope this is well above expected
> usage. After 1,000 requests/month it's roughly $1.50 per additional
> 1,000 images. Set a billing alert if you're worried (we recommend
> $5/month with 50% / 100% triggers).

---

## Project-level setup (one-time, per GCP project)

### Step 1 — Open the Firebase project in Cloud Console

Visit <https://console.cloud.google.com/?project=alchemyai-2ff0a> and
sign in with the Google account that has access to the Firebase
project. Firebase projects are GCP projects under the hood — same
project ID, same auth.

### Step 2 — Upgrade Firebase to the Blaze plan

Go to <https://console.firebase.google.com/u/0/project/alchemyai-2ff0a>.
In the bottom-left of the Firebase Console, click the **Upgrade** link
(or the "Spark" plan badge), then choose **Blaze (Pay as you go)**.

You'll need to attach a billing account. If your team doesn't have one,
create one (a credit card is required, but new accounts get the $300
GCP free trial). Set a budget alert during this step if you want a
safety net.

### Step 3 — Enable the Cloud Vision API

In the Cloud Console search bar, type **Cloud Vision API** and click
the result. On that page, click the blue **Enable** button. Wait
~30 seconds — the button will change to **Manage** when it's done.

Direct link: <https://console.cloud.google.com/apis/library/vision.googleapis.com?project=alchemyai-2ff0a>

### Step 4 — Grant the Firebase Admin service account a Vision role

Our backend uses the Firebase Admin service account
(`firebase-adminsdk-xxxxx@alchemyai-2ff0a.iam.gserviceaccount.com`)
for both Firebase token verification AND Vision API calls. We just
need to add the Vision permission to it.

1. Open <https://console.cloud.google.com/iam-admin/iam?project=alchemyai-2ff0a>
2. Find the row whose principal looks like
   `firebase-adminsdk-xxxxx@alchemyai-2ff0a.iam.gserviceaccount.com`
3. Click the pencil (Edit) icon on that row
4. Click **Add another role**
5. Type "Cloud Vision" in the role filter
6. Select **Cloud Vision AI Service Agent** (or "Cloud Vision API User"
   if that's what shows up — both work)
7. Click **Save**

> Why this specific role and not "Owner"? Principle of least privilege.
> If this key ever leaks, it can only call Vision, not delete the
> Firebase project.

---

## Per-developer setup

Each teammate needs to download their own `serviceAccount.json` (or
share one) and add a single line to `backend/.env`. Both files are
gitignored.

### Download `serviceAccount.json`

Follow Section 3.2 of the team Local Development Setup Guide —
Firebase Console → Project Settings → Service Accounts →
**Generate new private key** → save into `backend/serviceAccount.json`.

### Confirm `backend/.env`

Make sure `backend/.env` contains:

```
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
```

The path is relative to `backend/`. No quotes around the value.

### Verify

Start the backend:

```bash
cd backend
npm run dev
```

Expected output:

```
Server running on port 5000
```

You should NOT see:

* `[vision] No GCV credentials configured ... Using MOCK mode.` →
  `serviceAccount.json` is missing or `GOOGLE_APPLICATION_CREDENTIALS`
  isn't set.
* `Error: ENOENT ... serviceAccount.json` →
  `GOOGLE_APPLICATION_CREDENTIALS` points to a file that doesn't exist.
* `Error: 7 PERMISSION_DENIED: This API method requires billing to be enabled` →
  Step 2 (Blaze upgrade) didn't finalize, or you need to wait 2–3
  minutes for it to propagate after upgrading.
* `Error: 7 PERMISSION_DENIED: ... has not been used in project` →
  Step 3 (Vision API enable) didn't finalize, or Step 4 (IAM role)
  hasn't been applied to the service account.

Once startup is clean, send a test image through `/api/scan` (via the
Scan flow on the iOS app or a curl call). You should get back ranked
ingredient candidates with confidence scores.

---

## Troubleshooting

### `[vision] Using MOCK mode` on every scan

The vision service falls back to mock mode when no GCV credentials are
configured. Check that:

1. `backend/serviceAccount.json` exists
2. `backend/.env` has `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json`
3. You're starting the backend from inside `backend/` (so the relative
   path resolves correctly)

### `Error: 7 PERMISSION_DENIED: This API method requires billing to be enabled`

The Blaze upgrade hasn't propagated yet. Wait 2–3 minutes, then retry.
If still failing after 5 minutes, double-check at
<https://console.cloud.google.com/billing/linkedaccount?project=alchemyai-2ff0a> —
it should say **Billing is enabled**.

### Backend crashes on startup with `ENOENT: serviceAccount.json`

`GOOGLE_APPLICATION_CREDENTIALS` is set in `.env` but the file isn't
there. Either:

* Download `serviceAccount.json` (see "Per-developer setup" above), OR
* Comment out the `GOOGLE_APPLICATION_CREDENTIALS` line in `.env` to
  fall back to mock mode while you sort it out

### Scan returns "Failed to process image" on the iOS app

Check the backend terminal — the real error will be logged there. Most
likely one of the `PERMISSION_DENIED` errors above. Once the backend
log is clean, the iOS app will get real results.

---

## References

* [Cloud Vision API pricing](https://cloud.google.com/vision/pricing)
* [Authenticating to Cloud Vision](https://cloud.google.com/vision/docs/setup)
* [SCRUM-187 — Vision API integration](https://csu-team-the-alchemists.atlassian.net/browse/SCRUM-187)
* [SCRUM-197 — Public `/api/scan` endpoint](https://csu-team-the-alchemists.atlassian.net/browse/SCRUM-197)
