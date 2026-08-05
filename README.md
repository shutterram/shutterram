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
| Auth flows | Email + password sign-in, email-link password recovery (`/reset-password`), role check via `user_roles` table |
| Section management | `page_sections` table drives per-page section order, visibility and wording |
| Global UX states | Route-level pending loader (`PageLoader`), error boundary screen (`SiteErrorScreen`), scroll-to-top control |
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

### Password reset (admin accounts)
The studio ships with a self-service reset flow:

1. On `/auth`, click **Forgot password?** and enter the account email.
2. Supabase Auth emails a recovery link pointing at `<your-site>/reset-password`
   (the app passes `redirectTo: ${window.location.origin}/reset-password`).
3. That page (`src/routes/reset-password.tsx`) is public, reads the recovery session from the URL
   and calls `supabase.auth.updateUser({ password })` to set the new password.

**Setup required on your own Supabase project:**

- **Redirect URLs** — Authentication → URL Configuration: set *Site URL* to your production origin
  and add `https://your-domain.com/reset-password` (plus `http://localhost:8080/reset-password` for
  local dev) to *Redirect URLs*. Links to URLs not on this list are rejected.
- **SMTP** — Authentication → Emails → SMTP Settings: Supabase's built-in sender is rate-limited and
  meant for testing only. Point it at a real sender (Resend, Postmark, SendGrid, Amazon SES, your own
  SMTP) so reset emails actually arrive.
- **Email template** — Authentication → Emails → Templates → *Reset password*: the template must keep
  the `{{ .ConfirmationURL }}` variable; restyle the copy around it freely.
- **Expiry / rate limits** — recovery links default to 1 hour (`Email OTP expiration`) and auth emails
  are hourly-rate-limited under Authentication → Rate Limits; raise it if you have many admins.
- Keep `/reset-password` **outside** any auth guard — it must be reachable while signed out.



### What's editable
`Site & About` (studio name, tagline, email, phone, location, form endpoint, about copy, quote-form
dropdown options, loading-screen shape/size/pulse/fade), `Logos`, `Hero categories`, `Photos`, `Services`, `Editing samples`, `Stats`,
`Experience`, `Testimonials`, `Process steps`, `Page sections`, `Social links`. Every list supports add, edit,
reorder (↑ ↓) and delete. **New entries (single or bulk) are inserted at the top of the list**, right
under the Add / Bulk upload controls, so you never have to scroll to fill them in; use ↑ ↓ to move
them wherever you want afterwards.

**Page sections** controls the sections themselves rather than their contents. Each row is one
section of one page (`Home — Featured work`, `About page — The Experience`, …) and lets you:

- rename it (studio-only label), edit its small eyebrow label, heading, italic second line and intro
  paragraph;
- reorder it with ↑ ↓ — the order in this list is the order the sections appear on the page;
- hide it with the **Show on site** switch, or delete it entirely (deleting removes the section from
  the page; re-add it by re-inserting the row with the same `page` + `section_key`).

The **Experience** section is configured per page, so the About page can use its own wording (for
example *"How you can work with me"*). Its milestones live in **Process steps**, where each step is
assigned to either *Home & Services pages* or *About Me page* via the “Which Experience section”
dropdown.

Photos and Services use a **Category** dropdown with inline *Add* / *Remove*, so gallery categories
can be created and deleted from the studio. Editing samples take two images — a **Before**
(original) and an **After** (edited) frame — which power the comparison slider on the home page.


**Logos** lets you use a different logo in each place one appears:

| Slot | Where it shows |
| --- | --- |
| Header logo | Site header (desktop and mobile, both scrolled and top states) |
| Mobile menu logo | Top of the full-screen mobile navigation drawer |
| Footer logo | Footer brand lockup |
| Loading screen logo | Centre of the animated loader |
| Browser tab icon (favicon) | Browser tab / bookmark icon |

Upload an SVG or PNG per slot, or paste a URL. Any slot left empty falls back to the built-in
`SRLogo.svg`. **Invert logo colours** flips dark artwork to white for the dark theme — turn it off
if you upload logos that are already light. Transparent SVG/PNG works best; favicons should be
square.

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

**Social links** accept either a built-in icon name (`instagram`, `facebook`, `twitter`, `flickr`)
or a **custom icon** you upload (SVG or PNG). Uploaded icons are rendered through a CSS mask, so they
are automatically resized to the standard icon box and recoloured to match the site's text colour on
hover — upload a single-colour silhouette with a transparent background for best results. All social
links open in a new tab (`target="_blank" rel="noreferrer noopener"`).

Uploads go to the **private** `site-images` Supabase Storage bucket and are served through
`/api/public/img/<key>`, so the bucket never has to be public.

### Client reviews
Share the `/review` link from the studio's **Client reviews** tab. Submissions land as `pending` and
only appear on the site once approved. Reviewer photographs open in the site lightbox inside the
review pop-up (arrows, keyboard, swipe) — they never open in a new tab.

Reviewer email addresses are **not** part of the public API: column-level privileges on
`testimonials.email` are revoked from both `anon` and `authenticated`, and the studio reads them
through the admin-verified server function in `src/lib/review-emails.functions.ts`. If you add a new
query against `testimonials`, select explicit columns — `select("*")` will fail.

### Content fallback
If the database is unreachable, the site renders the typed defaults in
`src/data/portfolio.defaults.ts`, so it never shows an empty page.

---

### Light & dark mode
Visitors switch themes with the sun/moon button in the header (and at the bottom of the mobile
menu). The choice is stored in `localStorage` under `shutterram-theme` and applied before the first
paint by a small inline script in `src/routes/__root.tsx`, so there is no flash of the wrong theme.

- Dark is the default for first-time visitors.
- Palettes live in `src/styles.css`: `:root`/`.dark` for dark, `.light` for light. Both use the same
  semantic tokens (`--background`, `--foreground`, `--hairline`, `--glow`…), so components never
  hardcode colours.
- Logos flagged **Invert logo** in the studio are inverted only in dark mode, so a black source logo
  stays black on the light theme.
- The hero overlay uses the `.hero-scrim` utility (bottom of `src/styles.css`), which has separate
  strengths per theme — light mode uses a deliberately lighter gradient so photographs stay visible,
  while keeping enough contrast at the very top and bottom for the header and slide copy. Both the
  home hero and the gallery category hero share this one utility, so tuning it changes both.

### SEO tab
Every page's search and social metadata is editable under **SEO** in the studio (`seo_pages` table).
Each row is one page path:

| Field | Used for |
| --- | --- |
| Page path | which route the record applies to (`/`, `/about`, `/gallery/wedding`, …) |
| Title tag | `<title>` — keep under 60 characters |
| Meta description | `<meta name="description">` — keep under 160 characters |
| Keywords | `<meta name="keywords">` (optional) |
| Social share title / description / image | `og:*` and `twitter:*` tags |
| Canonical URL | `<link rel="canonical">` and `og:url` |
| Search engines | `index, follow` or `noindex, nofollow` |

Blank fields fall back to the per-route defaults baked into each route file, so a half-filled record
never produces empty tags. Add a row for a new gallery category simply by entering its path.

Also shipped:

- `/sitemap.xml` is generated at request time from the SEO records plus every gallery category, and
  skips anything marked `noindex` (`src/routes/sitemap[.]xml.tsx`).
- `public/robots.txt` allows crawlers, disallows `/admin`, `/auth`, `/review`, `/reset-password`, and
  points at the sitemap.
- JSON-LD: `LocalBusiness` on the home page and `CollectionPage` on category galleries.
- `/review` is `noindex, nofollow` so the client review link never appears in search.

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
   `stats`, `experience`, `testimonials`, `process_steps`, `page_sections`, `socials`, `user_roles`, plus the
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
- **Deleting a page section** removes it from the live site immediately; keep a note of the
  `page` / `section_key` pair if you might want it back.
- **External links** (socials and anything you add) must open in a new tab — the shared components
  already set `target="_blank" rel="noreferrer noopener"`.
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

---

## 7. Deployment checklist

Work top to bottom. Everything here is a one-time setup except the final smoke test.

### Content
- [ ] Site name, tagline, contact email/phone and about copy filled in under **Site & About**.
- [ ] Hero slides: image, title, tagline and category set for each; no placeholder text left.
- [ ] Gallery photos uploaded and assigned to the right categories; unused categories removed.
- [ ] Featured/editing samples use **real before and after** images (the shipped BEFORE/AFTER SVGs
      are placeholders).
- [ ] Services have image, title, subtitle and description.
- [ ] Stats, experience steps, testimonials and page-section headings reviewed and reordered.
- [ ] Social links point at live profiles; custom icons uploaded where needed.

### Backend
- [ ] Supabase project created, schema + RLS + `GRANT`s applied (section 4.1).
- [ ] `site-images` storage bucket exists with admin write policies.
- [ ] Admin account created (first sign-up claims the role), then anonymous sign-ups disabled.
- [ ] Auth **Site URL** and **Redirect URLs** include the production domain plus
      `https://yourdomain.com/reset-password`.
- [ ] SMTP configured in Supabase Auth (needed for password-reset emails).
- [ ] Database backups scheduled.

### Forms
- [ ] `settings.form_endpoint` set to a live provider endpoint (section 5).
- [ ] Test submission sent from `/contact` for **both** the quote and message forms; emails received.

### Environment & build
- [ ] All variables from section 3 set on the host (`VITE_*` at build time, secrets server-side only).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never exposed to the client bundle.
- [ ] `npm run lint` and `npm run build` pass locally.
- [ ] `npm run preview` sanity-checked against the production build.

### SEO & polish
- [ ] Every page reviewed in the studio **SEO** tab (title, description, social image, canonical).
- [ ] Canonical URLs use your real domain — the defaults point at `https://shutterram.lovable.app`
      (`SITE_URL` in `src/lib/seo.ts`); change it there and in `public/robots.txt` when you move.
- [ ] `/sitemap.xml` loads and lists every public page.
- [ ] `public/robots.txt` allows the public pages and disallows `/admin`, `/auth`, `/review`.
- [ ] Light and dark mode both checked on every page (header, hero, forms, footer, lightbox).
- [ ] Favicon and OG image resolve at absolute `https://` URLs.
- [ ] Images exported at ~2000px long edge, under ~400 KB each.

### QA test pass (run before every deploy)

Verified in the last pass on this build — repeat after any content or code change:

- [ ] All routes return 200 and each has its own title: `/`, `/gallery`, `/services`, `/about`,
      `/contact`, `/review`; unknown URLs render the 404 page.
- [ ] Browser console is clean on every route at 1280px and 390px widths (no errors, no failed
      requests other than the intentional 404).
- [ ] No image renders with an empty `src` — rows saved without an image fall back to
      `/placeholders/photo.svg`, which means content is missing in the studio.
- [ ] Lightbox: opens centred, arrows sit beside the frame, CLOSE works, Esc works, swipe works on
      mobile, first and last images stay in frame.
- [ ] Contact page defaults to **Request a Quote**; the message toggle and the "Start a conversation"
      / "Work with me" links open the message form.
- [ ] Home services rail and testimonials loop endlessly and pause on hover/tap.
- [ ] `/admin` loads for an admin account, each studio tab saves, and **Refresh site** shows the
      change on the public pages.
- [ ] Logos: change each logo slot in the studio and confirm header, mobile drawer, footer, loader
      and favicon all update.
- [ ] Review photos open in the in-page lightbox (not a new tab) and navigate between images.
- [ ] Security scan clean: no public read of reviewer emails, no `settings.form_endpoint` exposure,
      `/admin` unreachable when signed out.

### Go live
- [ ] Custom domain connected and HTTPS certificate active.
- [ ] Smoke test on desktop and mobile: hero slider, gallery lightbox (swipe + arrows), before/after
      sliders, services rail, testimonials loop, scroll-to-top, both contact forms.
- [ ] `/admin` login works on the production domain and a content edit shows up on the live site.
- [ ] Password-reset email received and the new password works.
- [ ] 404 page renders for an unknown URL and deep links survive a hard refresh.

