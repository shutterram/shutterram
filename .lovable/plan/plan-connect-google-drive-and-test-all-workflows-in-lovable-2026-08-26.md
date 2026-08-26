# Plan: Connect Google Drive and test all workflows in Lovable preview

Goal: get the Google Drive-powered CRM features (contracts, galleries, storage) working inside the current Lovable preview before moving to Vercel production.

## What you need to do now

### 1. Create Google OAuth credentials

1. Go to https://console.cloud.google.com/apis/credentials.
2. Create a project (or pick an existing one).
3. Enable the **Google Drive API**.
4. Create an **OAuth 2.0 Web application client**.
5. Add these authorized redirect URIs:
   - `https://id-preview--45f3e6db-80e3-4769-9011-011ab2cc627f.lovable.app/api/public/google/callback`
   - `https://shutterram.lovable.app/api/public/google/callback`
   - (Add Vercel/preview URLs later if you deploy there.)
6. Copy the **Client ID** and **Client Secret**.

### 2. Add the secrets to Lovable (not `.env`)

Do **not** put these in the `.env` file — that file is tracked by GitHub and the Supabase keys there are publishable. Your Google credentials are private, so store them as Lovable runtime secrets.

I will open the secure form for you. Add these three values:

- `GOOGLE_CLIENT_ID` — from your Google Cloud Console OAuth client
- `GOOGLE_CLIENT_SECRET` — from the same client
- `GOOGLE_REDIRECT_URI` — `https://id-preview--45f3e6db-80e3-4769-9011-011ab2cc627f.lovable.app/api/public/google/callback`

Once saved, the Lovable preview backend can use them immediately.

### 3. Verify Supabase storage buckets

Make sure these three private buckets exist in your Lovable Cloud backend:

- `crm-docs` — original contract PDFs and signed copies
- `crm-galleries` — gallery/selection preview images and metadata
- `site-images` — public site portfolio images

If any are missing, create them manually in Lovable Cloud storage settings.

### 4. Connect Google Drive inside the app

1. Open the Lovable preview of `/admin` and sign in.
2. Navigate to **CRM → Settings**.
3. Click **Connect Google Drive** and complete the OAuth consent.
4. Set a default folder for signed contracts and one for gallery RAW files if prompted.

### 5. Test all workflows in Lovable preview

Run these end-to-end checks in order:

#### A. Contract signing
1. In **CRM → Contracts**, upload a PDF.
2. Add signature, date, text, and custom fields by clicking or right-clicking on the PDF.
3. Save and create a signing link.
4. Open the signing link in a new tab or browser and sign as a client.
5. Confirm the signed PDF is saved, and the contract status updates to "Signed".
6. Check that the signed PDF is copied to the configured Google Drive folder.

#### B. Client gallery / photo selection
1. In **CRM → Galleries**, create a gallery.
2. Choose either:
   - Upload preview images directly (with compression setting), or
   - Link a Google Drive preview folder and optional RAW folder.
3. Open the client link.
4. Verify sorting by filename, full-screen lightbox, swiping, zoom, and scroll rail.
5. Test starred-only filter, bulk selection, and comments.
6. Submit picks and confirm the photographer can download the worksheet CSV.
7. If a Drive RAW folder is linked, verify "Send RAWs to Drive" works.

#### C. Public website + admin studio
1. Visit the Lovable preview homepage.
2. Confirm the header, hero slider, gallery, services, testimonials, and footer render correctly.
3. In `/admin`, make a small text change and confirm it appears on the public preview.
4. Verify dark/light mode and color controls still work.

## Outcome

After this plan is complete, Google Drive will be connected, the three main workflows (contract signing, client gallery, public site) will be verified in the Lovable preview, and you will be ready to either publish to `shutterram.lovable.app` or set up Vercel preview/production deployments.

## Next steps after this

- Set up Vercel preview deployments if you want branch-based preview URLs.
- Configure an email domain if you want signing-request and completion emails.
- Re-publish the production site once testing is complete.
