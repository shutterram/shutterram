# Shutter Ram — Photography Portfolio & Content Studio

A single-photographer portfolio site with a private, database-backed content studio, so every
headline, paragraph, photo, service and testimonial can be edited without touching code.

- Public site: `/`, `/about`, `/services`, `/gallery`, `/gallery/:category`, `/contact`
- Hidden review-collection page: `/review`
- Sign in: `/auth`
- Content Studio (admin only): `/admin`

---

## 1. Technology stack

| Layer | Technology |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) v1 (React 19, SSR + server functions) |
| Routing | TanStack Router (file-based, `src/routes`), generated `routeTree.gen.ts` |
| Data fetching | TanStack Query + route loaders |
| Build tool | Vite 7/8 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (config-less, tokens in `src/styles.css`) + shadcn/ui primitives (Radix) |
| Icons | lucide-react |
| Notifications | sonner |
| Validation | zod |
| Database / Auth / Storage | Supabase (Postgres + Row Level Security, Supabase Auth, Supabase Storage) |
| Fonts | Literata (display) + Manrope (body), loaded via `<link>` in `src/routes/__root.tsx` |
| Deployment target | Edge/Node server (Cloudflare Workers by default; Vercel/Netlify/Node also work) |

### Project layout

```
src/
  routes/                 file-based routes (each file = one URL)
    __root.tsx            document shell, fonts, header/footer, site content loader
    index.tsx             home page
    _authenticated/       auth-gated subtree (route.tsx is the gate)
      admin.tsx           Content Studio
    api/public/img.$.ts   image proxy that streams files out of private storage
  components/
    site/                 public site components (hero, lightbox, testimonials, …)
    admin/ContentEditor.tsx  studio editors (singleton, list, bulk upload)
    ui/                   shadcn primitives
  data/portfolio.ts       typed fallback content used if the database is unreachable
  lib/
    site-content.functions.ts  server function that loads all site content
    submit-form.functions.ts   server function that forwards form submissions
  integrations/supabase/  generated clients, types, auth middleware
supabase/                 project config; migrations are applied via the platform
```

---

## 2. The Content Studio

### Accessing it
1. Go to `/auth` and create an account (the **first** account created is the administrator).
2. You are redirected to `/admin`.

### What's editable
`Site & About` (studio name, tagline, email, phone, location, form endpoint, about copy, quote-form
dropdown options), `Hero categories`, `Photos`, `Services`, `Editing samples`, `Stats`,
`Experience`, `Testimonials`, `Process steps`, `Social links`. Every list supports add, edit,
reorder (↑ ↓) and delete.

### Uploading images
Two ways, both in the studio:

- **Single image** — open a row, use the *Upload* button on any image field, or paste an external
  image URL.
- **Bulk upload** — at the top of any list that has an image field:
  1. **Choose files** and select as many images as you like.
  2. Each staged file gets its own attribute form (caption, category, featured flag, order, …).
     The filename is pre-filled as the title/caption.
  3. **Apply first to all** copies the first file's attributes onto every other file (titles stay
     per-file) — handy when uploading a whole wedding set into one category.
  4. **Upload N** uploads every file and creates its row. Failures are reported per file and stay
     in the list so you can retry; successful ones disappear and appear in the list below.

Uploads go to the **private** `site-images` Supabase Storage bucket and are served through
`/api/public/img/<key>`, so the bucket never has to be public.

### Content fallback
If the database is unreachable, the site renders the typed defaults in
`src/data/portfolio.defaults.ts`, so it never shows an empty page.

---

## 3. Environment variables

Client-visible (safe to expose, must be present at build time):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable/anon key>
VITE_SUPABASE_PROJECT_ID=<project ref>
```

Server-only (never expose to the browser):

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable/anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # used by server functions only
```

Rules of thumb: `import.meta.env.VITE_*` in browser code, `process.env.*` **inside** server
function handlers only (never at module scope).

---

## 4. Hosting it yourself

The app is ordinary TanStack Start code — nothing is tied to the platform it was built on.

### 4.1 Prepare a Supabase project
1. Create a project at supabase.com (or self-host Supabase).
2. Recreate the schema: tables `settings`, `categories`, `photos`, `services`, `edit_samples`,
   `stats`, `experience`, `testimonials`, `process_steps`, `socials`, `user_roles`, plus the
   `app_role` enum, the `has_role()` function and the `touch_updated_at()` trigger. Export from the
   current database with `pg_dump --schema-only` (plus `--data-only` for your content) and import
   into the new one, or copy the SQL from `supabase/migrations/` if present.
3. Keep the RLS model: public `SELECT` for site content, writes restricted to
   `has_role(auth.uid(), 'admin')`, and `GRANT`s for `anon` / `authenticated` / `service_role`.
   `settings.form_endpoint` is deliberately **not** readable by `anon`.
4. Create a **private** storage bucket named `site-images` and an `INSERT`/`UPDATE`/`DELETE` policy
   on `storage.objects` for admins.
5. Copy your photos across (Storage → download/upload, or the `storage.objects` API).
6. In Auth settings, disable anonymous sign-ups once your admin account exists.

### 4.2 Build and run

```sh
npm install
npm run build     # production build
npm run preview   # serve the build locally
```

`npm run dev` starts the dev server on port 8080.

### 4.3 Deploy

- **Cloudflare Workers** (default target): `npm run build`, then deploy the generated output with
  Wrangler. Set all environment variables as Worker secrets/vars.
- **Vercel / Netlify**: import the repo, build command `npm run build`, and add the environment
  variables in the dashboard. Both auto-detect Nitro output.
- **Your own VPS / Docker**: `npm ci && npm run build`, then run the produced server entry with
  Node 20+ behind nginx/Caddy. Provide the env vars through the process environment.

### 4.4 Things to keep in mind

- **`VITE_*` variables are baked in at build time** — changing them requires a rebuild, not just a
  restart.
- **`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS.** Keep it server-side only; never put it in a `VITE_`
  variable or client bundle.
- **Serverless/edge runtime limits**: no `child_process`, no `sharp`/`canvas`, no persistent local
  filesystem. Resize images before uploading rather than on the server.
- **Image weight** drives page speed more than anything else here — export JPEG/WebP at roughly
  2000px on the long edge and under ~400 KB.
- **The first account created becomes the admin.** Create yours before sharing the URL, and keep
  `/admin` and `/auth` unlinked (both are `noindex`).
- **Backups**: schedule Supabase database backups; storage objects are not covered by SQL dumps.
- **Route metadata**: each route defines its own `head()` with title/description/OG tags — update
  these if you rename the studio.

---

## 5. Wiring the contact forms to an email service

The contact page has two forms (Request a Quote, Send a Message). Submissions are posted to a
server function (`src/lib/submit-form.functions.ts`), which reads the endpoint URL from
`settings.form_endpoint` in the database and forwards the payload as JSON. **The endpoint URL is
never sent to the browser.**

### Setup
1. Create a form endpoint with any provider that accepts a JSON `POST`:
   - [Formspree](https://formspree.io) — endpoint looks like `https://formspree.io/f/xxxxxxx`
   - [Basin](https://usebasin.com) — `https://usebasin.com/f/xxxxxxxx`
   - [Getform](https://getform.io) — `https://getform.io/f/xxxxxxxx`
   - [Web3Forms](https://web3forms.com), [FormSubmit](https://formsubmit.co), or your own webhook
     (a Zapier/Make catch hook, a Supabase Edge Function, an n8n workflow, …)
2. Open `/admin` → **Site & About** → **Form endpoint URL**, paste the URL, and save.
3. Send a test submission from `/contact` and confirm the email arrives. Verify your sender/reply-to
   address inside the provider if it asks.

### Payload shape
```json
{
  "_subject": "New quote request — Wedding Photography",
  "Name": "…", "Email": "…", "Phone": "…",
  "Service": "…", "Event date": "…", "Location": "…",
  "Hours": "…", "Budget": "…", "Details": "…"
}
```
Field names match the form labels, so provider email templates and spreadsheet exports stay
readable. Add a provider-side autoresponder if you want clients to get a confirmation email.

### Notes
- If the endpoint is empty or not `https://`, submissions are accepted by the UI but not delivered —
  set the URL before going live.
- All input is validated with zod both client- and server-side (length caps, email format).
- To store submissions in your own database instead, point the endpoint at your own webhook, or
  extend the server function with an `insert` into a new `submissions` table (remember RLS + grants).

---

## 6. Local development

```sh
git clone <your-repo-url>
cd <repo>
npm install
cp .env.example .env    # or create .env with the variables from section 3
npm run dev             # http://localhost:8080
```

Useful scripts: `npm run lint`, `npm run format`, `npm run build`, `npm run preview`.
