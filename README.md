# Shutter Ram — Photography Portfolio & Content Studio

A single-photographer portfolio site with a private, database-backed **Content Studio**, so every
headline, paragraph, photo, colour, logo, service, review and SEO tag can be edited without touching
code.

| URL | What it is | Access |
| --- | --- | --- |
| `/` | Home — hero slider, about, stats, featured work, editing power, services, experience, testimonials, connect | Public |
| `/gallery` | Full gallery with category filters | Public |
| `/gallery/:category` | One category (wedding, corporate, portrait, headshots, …) | Public |
| `/services` | All services, alternating editorial layout | Public |
| `/about` | About Me, stats, kit, experience | Public |
| `/contact` | Request a Quote / Send a Message toggle | Public |
| `/review` | Client review submission form (unlisted, `noindex`) | Share by link |
| `/auth` | Sign in + forgot password | Public |
| `/reset-password` | Password recovery landing page | Public (must stay unguarded) |
| `/admin` | Content Studio | Admin only |
| `/sitemap.xml` | Generated at request time | Crawlers |
| `/api/public/img/<key>` | Image proxy that streams files out of private storage | Public |

---

## Table of contents

1. [Technology stack](#1-technology-stack)
2. [Project layout](#2-project-layout)
3. [How the site gets its content](#3-how-the-site-gets-its-content)
4. [The Content Studio](#4-the-content-studio)
5. [Database schema & security model](#5-database-schema--security-model)
6. [Environment variables](#6-environment-variables)
7. [Local development](#7-local-development)
8. [Hosting it yourself](#8-hosting-it-yourself)
9. [Contact forms → email](#9-contact-forms--email)
10. [Auth & password reset setup](#10-auth--password-reset-setup)
11. [SEO, sitemap & Search Console](#11-seo-sitemap--search-console)
12. [Design system, theming & animation](#12-design-system-theming--animation)
13. [Deployment checklist](#13-deployment-checklist)
14. [QA test pass](#14-qa-test-pass)
15. [Troubleshooting](#15-troubleshooting)
16. [Extending the site](#16-extending-the-site)
17. [Long-term maintenance & operations](#17-long-term-maintenance--operations)
18. [Quick reference — "where do I change X?"](#18-quick-reference--where-do-i-change-x)

---

## 1. Technology stack

| Layer | Technology |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) v1 (React 19, SSR + server functions) |
| Routing | TanStack Router, file-based in `src/routes` (`routeTree.gen.ts` is generated — never edit) |
| Data fetching | Route loaders + TanStack Query |
| Build tool | Vite |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (config-less; tokens in `src/styles.css`) + shadcn/ui primitives (Radix) |
| Icons | lucide-react |
| Toasts | sonner |
| Validation | zod (client **and** server) |
| Database / Auth / Storage | Supabase — Postgres + Row Level Security, Supabase Auth, Supabase Storage |
| Image handling | Browser-side WebP conversion + downscale (`src/lib/optimise-image.ts`) |
| Fonts | Literata (display) + Manrope (body), loaded via `<link>` in `src/routes/__root.tsx` |
| Runtime target | Edge or Node server (Cloudflare Workers by default; Vercel / Netlify / VPS all work) |

**Key constraint:** the server runtime is a Worker-style sandbox. No `child_process`, no `sharp` /
`canvas`, no persistent local filesystem. Anything image-related happens in the browser before
upload.

---

## 2. Project layout

```
src/
  routes/                          file-based routes — one file per URL
    __root.tsx                     document shell: fonts, theme script, header/footer,
                                   favicon, cursor glow, site-content loader
    index.tsx  about.tsx  services.tsx  contact.tsx  review.tsx  auth.tsx
    gallery.index.tsx  gallery.$category.tsx
    reset-password.tsx
    sitemap[.]xml.tsx              dynamic sitemap
    _authenticated/route.tsx       auth gate for the subtree
    _authenticated/admin.tsx       Content Studio (tab definitions live here)
    api/public/img.$.ts            signed-URL image proxy for the private bucket
  components/
    site/                          public components — HeroSlider, Lightbox, Testimonials,
                                   BeforeAfterSlider, SiteHeader, SiteFooter, PageLoader,
                                   SiteErrorScreen, ScrollToTop, CursorGlow, Reveal, …
    admin/                         ContentEditor, CopyEditor, LogoStudio, ThemeStudio,
                                   ReviewModeration
    ui/                            shadcn primitives
  data/
    portfolio.defaults.ts          typed built-in content (fallback if the DB is unreachable)
    portfolio.ts                   live bindings + applyContent() that swaps in DB rows
  lib/
    site-content.functions.ts      server fn: loads every content table in one round trip
    submit-form.functions.ts       server fn: forwards contact submissions to your form provider
    submit-review.functions.ts     server fn: accepts client reviews (pending)
    review-emails.functions.ts     server fn: admin-only reveal of reviewer emails
    seo.ts / seo.server.ts / seo.functions.ts   metadata resolution + SITE_URL
    sitemap.server.ts              category paths for the sitemap
    optimise-image.ts              WebP conversion + downscale before upload
    theme-css.ts                   turns theme_tokens rows into CSS variables
  integrations/supabase/           generated clients, types, auth middleware (do not edit)
  styles.css                       design tokens, dark/light palettes, utilities
public/                            favicon.svg, robots.txt, placeholders/
supabase/config.toml               project config
```

---

## 3. How the site gets its content

1. `src/routes/__root.tsx` calls the `loadSiteContent` server function
   (`src/lib/site-content.functions.ts`) during SSR.
2. That function selects **explicit columns** from every content table in parallel and returns one
   payload.
3. `applyContent()` in `src/data/portfolio.ts` swaps the payload into the exported live bindings
   (`site`, `categories`, `photos`, `services`, `copyMap`, `themeTokens`, …).
4. Components read those bindings, plus `t("key", "fallback")` for individual strings and
   `sectionFor(page, key)` for section headings/visibility.
5. If the database is unreachable, the values in `src/data/portfolio.defaults.ts` are rendered
   instead, so the site never shows an empty page.

**Consequence:** to add a new editable string, add a row in the studio's **Wording** tab and call
`t("your.key", "fallback")` in the component. No migration needed.

---

## 4. The Content Studio

### Getting in
1. Go to `/auth` and create an account — the **first** account created becomes the administrator.
2. You are redirected to `/admin`. Disable anonymous sign-ups in Supabase Auth afterwards.
3. `/admin` and `/auth` are unlinked from the public navigation and marked `noindex`.

Press **Refresh site** after saving to reload public pages with the new content.

### Tabs

| Tab | What it controls |
| --- | --- |
| **Site & About** | Studio name, tagline, email, phone, location, default social share image, about copy (short + long), **the About page photographer photo**, **default grid columns per page per device**, quote-form budget/hours options, loading-screen shape/size/pulse/fade, cursor-glow size/softness/blend mode |
| **Form delivery** | The private form endpoint URL (never sent to the browser) |
| **Logos** | A different logo per slot, with a live preview and height / X / Y nudge sliders |
| **Colours** | Every colour token, separately for dark and light mode, with intensity (opacity) sliders, per-token **Undo / Redo / Reset to default** and a **Reset all** |
| **Fonts** | Font family, size, weight, letter-spacing and line-height per **section** and per **device** (desktop / tablet / mobile), with a live sample of the real site text |
| **Wording** | Every standalone string on the site (buttons, labels, micro-copy), grouped |
| **Text contrast** | A switch per piece of text that sits on top of a photograph (hero title/tagline/buttons, category covers, gallery captions, service cards, Before/After labels) — flip it to make that text the opposite colour so it stays readable |
| **Share links** | Create unlisted links to a category (or the whole gallery), each with its own **Show private images** choice; copy or revoke them at any time |
| **Users** | Add maintainers, grant or remove Content Studio (admin) access, reset a password, remove an account |
| **SEO** | Per-path title, description, keywords, OG title/description/image, canonical, robots — plus a **Page coverage** panel that lists any site page (including new gallery categories) that has no SEO row yet and adds them in one click |
| **Client reviews** | The shareable `/review` link + approve / edit / delete submissions |
| **Hero categories** | Slug, title, label, tagline, hero image and **category cover image** per category |
| **Photos** | Caption, category, image, featured flag + position, the three visibility switches, internal key |
| **Services** | Title, subtitle, slug, gallery category, description, image, includes list, price line |
| **Editing samples** | Title, note, **Before** photo and **After** photo for the comparison slider |
| **Stats** | Value + label pairs |
| **Testimonials** | Name, role, quote, rating (placeholder/manual entries) |
| **Page sections** | Order, visibility, eyebrow, heading, italic second line and intro of every section on every page |
| **Process steps** | The Experience milestones, assigned to *Home & Services* or *About Me* |
| **Social links** | Name, URL, built-in icon name, or a custom uploaded icon |

Every list supports add, edit, reorder (↑ ↓) and delete. **New entries — single or bulk — are
inserted at the top of the list**, right under the Add controls, so you never scroll to fill them in.

### Saving your edits
Long tabs (Fonts, Colours, Wording, Photos…) never make you hunt for the Save button: as soon as any
field changes, a **floating save bar** appears pinned to the bottom of the viewport
(`src/components/admin/FloatingSaveBar.tsx`, rendered through a React portal onto `document.body` so
no transformed parent can trap it). Click **Save changes** from wherever you are on the page. The
static button at the bottom of each tab still works and does the same thing.

### Colours tab safety net
Every token row has three icon buttons on the right:

| Button | Effect |
| --- | --- |
| ↶ Undo | Step back through your changes to that single token (per-token history, unlimited depth for the session) |
| ↷ Redo | Step forward again |
| ⟲ Reset | Restore that token's shipped default (`default_dark_*` / `default_light_*` columns) |

**Reset all** at the top restores every token's default in one action — and is itself undoable per
token. History lives in memory only, so it clears on reload; **Save** is what makes changes
permanent. Colour edits apply to the public site after a reload.

The mobile navigation drawer uses its **own** `nav-surface` token, deliberately decoupled from the
page background so you can tune the hero fade without turning the mobile menu transparent.

### Fonts tab
Typography is stored in `type_tokens` and rendered into CSS variables by `src/lib/type-css.ts`.
Each row targets one **section** of the site (hero headline, section heading, body copy, eyebrow,
buttons, footer, …) and each row exposes **three device columns** — desktop, tablet, mobile — so a
headline can be 72px on desktop and 34px on mobile without touching code. Each row shows a real
sample of the text it controls, so you can tune it visually. Google Fonts named here are loaded
automatically, so picking a new family needs no code change.

**Font library.** At the top of the Fonts tab you can load brand-new fonts into the site:

- **Font name** — any Google Font name (e.g. *Instrument Sans*), or the family name served by your
  own stylesheet.
- **Where it loads from** — *Google Fonts* (the link is built for you) or *Stylesheet link* for a
  CSS URL from another provider (Adobe Fonts, Fontshare, a self-hosted `@font-face` sheet).
- **Weights** (100–900) and **styles** (normal / italic) — only what you tick is downloaded, so the
  site stays fast.

Saved fonts live in the `custom_fonts` table, are served on every page from
`src/routes/__root.tsx` (`fontStylesheetHrefs` in `src/lib/type-css.ts`), and immediately appear in
every font dropdown — site heading font, site body font, and each per-section row.

### Page sections
Each row is one section of one page (`Home — Featured work`, `About page — The Experience`, …):

- rename it (studio-only label), edit eyebrow / heading / italic line / intro;
- reorder with ↑ ↓ — this list's order is the on-page order;
- hide with **Show on site**, or delete it entirely. Re-add by re-inserting a row with the same
  `page` + `section_key` pair — keep a note of the pair if you might want it back.

The **Experience** section is configured per page, so About can use its own wording
(e.g. *"How you can work with me"*). Its milestones live in **Process steps**, assigned via the
*Which Experience section* dropdown.

### Categories
Photos and Services use a **Category** dropdown with inline *Add* / *Remove*, so gallery categories
are created and deleted from the studio. Category pages (`/gallery/:category`) and the sitemap pick
them up automatically.

### Uploading images
- **Single** — the *Upload* button on any image field, or paste an external image URL.
- **Bulk** — at the top of any list with an image field:
  1. **Choose files** — select as many as you like.
  2. Each staged file gets its own attribute form (caption, category, featured, order, …); the
     filename pre-fills the title.
  3. **Apply first to all** copies the first file's attributes onto the rest (titles stay per-file).
  4. **Upload N** uploads each file and creates its row. Failures are reported per file and stay in
     the staging list for retry.

**Automatic optimisation** (`src/lib/optimise-image.ts`): every upload is decoded in the browser,
downscaled to a **2400px** longest edge and re-encoded as **WebP q0.82** before storage — a toast
reports the saving. SVG and GIF pass through untouched; formats the browser can't decode (e.g. HEIC)
upload as-is. Client review photos get the same treatment before the 6 MB per-file check. Tune
`MAX_EDGE` / `QUALITY` in that file for larger originals.

Uploads land in the **private** `site-images` Supabase Storage bucket and are served through
`/api/public/img/<key>`, so the bucket is never public.

### Logos
| Slot | Where it shows |
| --- | --- |
| Header logo | Site header, desktop and mobile, top and scrolled states |
| Mobile menu logo | Top of the full-screen mobile drawer |
| Footer logo | Footer brand lockup |
| Loading screen logo | Centre of the animated loader |
| Browser tab icon | Favicon (applied at runtime) |

Upload SVG/PNG or paste a URL; empty slots fall back to the built-in `SRLogo.svg`. The **preview
panel** shows the slot in context and the height / offset-X / offset-Y sliders write to the
`logo_*_height` / `_offset_x` / `_offset_y` settings columns. **Invert logo colours** flips dark
artwork to white in dark mode only — turn it off for artwork that is already light. Favicons should
be square.

### Social links
Use a built-in icon name (`instagram`, `facebook`, `twitter`, `flickr`) **or** upload a custom icon.
Uploaded icons render through a CSS mask, so they are auto-sized to the icon box and recoloured on
hover — upload a single-colour silhouette with a transparent background. Every social link opens in
a new tab (`target="_blank" rel="noreferrer noopener"`).

### Client reviews
Share the `/review` link from the **Client reviews** tab. Submissions arrive as `pending` and only
appear on the site once approved. Reviewers can attach photos; those open in the site lightbox
*inside* the review pop-up (arrows, keyboard, swipe) — never a new tab.

Reviewer emails are **not** part of the public API: column privileges on `testimonials.email` are
revoked from `anon` and `authenticated`, and the studio reads them through the admin-verified server
function in `src/lib/review-emails.functions.ts`. **If you add a query against `testimonials`, select
explicit columns — `select("*")` will fail with a permission error.**

---

## 5. Database schema & security model

### Tables (all in `public`)

| Table | Purpose |
| --- | --- |
| `settings` | Singleton row: name, tagline, contact, about copy, loader, glow, logos, default OG image |
| `admin_settings` | Singleton row: the private `form_endpoint` (admin-only, never public) |
| `categories` | Gallery categories + hero image and tagline |
| `photos` | Gallery photos, category, featured flag/order, `in_gallery`, `is_private` |
| `services` | Service cards |
| `edit_samples` | Before/after comparison pairs |
| `stats` | Number + label strip |
| `process_steps` | Experience milestones (`section_key` = `default` or `about`) |
| `testimonials` | Reviews (`status` = `pending` / `approved`), optional images + email |
| `page_sections` | Per-page section order, visibility and wording |
| `site_copy` | Every standalone string (`key` → `value`) behind `t()` |
| `socials` | Social links + custom icon URLs |
| `theme_tokens` | Colour tokens with dark/light values and opacity |
| `type_tokens` | Typography per section per device |
| `custom_fonts` | Extra font families registered in the Fonts tab |
| `image_settings` | Per-image `indexable` + `is_private` switches |
| `text_inverts` | Per-text contrast switches for text over photos |
| `share_links` | Unlisted category/gallery links, each with `include_private` |
| `seo_pages` | Per-path SEO metadata |
| `user_roles` | `user_id` + `app_role` — the **only** place roles are stored |

Helpers: `app_role` enum, `has_role(uuid, app_role)` security-definer function,
`resolve_share_link(text)` security-definer function (turns a `?k=` token into a scope), and
`touch_updated_at()` triggers on every content table.

### RLS rules that must be preserved
- Public `SELECT` on content tables for `anon` + `authenticated`.
- All writes gated by `has_role(auth.uid(), 'admin')`.
- Explicit `GRANT`s for `anon` / `authenticated` / `service_role` on every table — RLS alone is not
  enough with PostgREST.
- `admin_settings` (form endpoint): **no** `anon` access at all.
- `testimonials`: `anon` reads only `status = 'approved'`; the `email` column is revoked from both
  `anon` and `authenticated` at the column level.
- `user_roles`: users may read their own row only; no client-side inserts/updates/deletes.
- Storage: `site-images` bucket is **private**; admin-only write policies on `storage.objects`.

**Never store roles on a profile/user row** — that is a privilege-escalation path. Keep them in
`user_roles` and check via `has_role()`.

---

## 6. Environment variables

Client-visible (safe to expose, **baked in at build time**):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable / anon key>
VITE_SUPABASE_PROJECT_ID=<project ref>
```

Server-only (never expose to the browser):

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable / anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server functions only — bypasses RLS
```

Rules of thumb:
- `import.meta.env.VITE_*` in browser code.
- `process.env.*` **inside** a server-function `.handler()` only — never at module scope, because
  env injection happens at call time.
- Changing a `VITE_*` value requires a **rebuild**, not just a restart.

---

## 7. Local development

```sh
npm install
cp .env.example .env     # or create .env with the variables from section 6
npm run dev              # http://localhost:8080
```

| Script | Does |
| --- | --- |
| `npm run dev` | Dev server on port 8080 |
| `npm run build` | Production build |
| `npm run build:dev` | Production build in development mode (useful for debugging prerender) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npx tsc --noEmit` | Type check |

Conventions worth knowing:
- One file per URL in `src/routes`; create the route before linking to it.
- Never edit `src/routeTree.gen.ts` or anything in `src/integrations/supabase/`.
- No hardcoded colours in components — use the semantic tokens from `src/styles.css`.
- Server functions: `createServerFn` from `@tanstack/react-start`; keep each `*.functions.ts` file a
  thin wrapper (imports + exported server functions only) and put helpers in a separate module.

---

## 8. Hosting it yourself

Nothing is tied to the platform this was built on — it is ordinary TanStack Start code.

### 8.1 Prepare a Supabase project
1. Create a project at supabase.com (or self-host Supabase).
2. Recreate the schema from section 5: all tables, the `app_role` enum, `has_role()`,
   `touch_updated_at()` and its triggers. Easiest path:
   `pg_dump --schema-only` from the current database (plus `--data-only` for your content) and
   import into the new one.
3. Re-apply the RLS policies **and** the `GRANT`s exactly as described in section 5. A missing
   `GRANT` produces "permission denied" even when RLS would allow the row.
4. Create a **private** bucket named `site-images` with admin `INSERT` / `UPDATE` / `DELETE`
   policies on `storage.objects`.
5. Copy your storage objects across (Storage UI download/upload, or the `storage.objects` API) —
   SQL dumps do **not** include files.
6. Create your admin account at `/auth`, insert the matching `user_roles` row if it isn't automatic,
   then disable anonymous sign-ups.

### 8.2 Build

```sh
npm ci
npm run build
npm run preview   # sanity check the production build
```

### 8.3 Deploy

- **Cloudflare Workers** (default target) — `npm run build`, deploy the generated output with
  Wrangler, and set every variable from section 6 as Worker vars/secrets.
- **Vercel / Netlify** — import the repo, build command `npm run build`; both auto-detect the Nitro
  output. Add the env vars in the dashboard, then redeploy so `VITE_*` values are baked in.
- **VPS / Docker** — `npm ci && npm run build`, run the produced server entry on Node 20+ behind
  nginx or Caddy, passing env vars through the process environment.

### 8.4 Things to keep in mind
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. Server-side only; never in a `VITE_` variable.
- Edge/serverless runtime limits: no `child_process`, no `sharp` / `canvas`, no persistent local FS.
- Image weight dominates page speed here — the studio already converts to WebP at ≤2400px, which is
  the right target for a photography site.
- The first account created becomes the admin. Create yours before sharing the URL.
- Schedule Supabase database backups; storage objects are separate.
- Update `SITE_URL` in `src/lib/seo.ts` and the sitemap line in `public/robots.txt` when you move to
  your own domain — canonical URLs, OG URLs and the sitemap all derive from it.

---

## 9. Contact forms → email

`/contact` has two forms (Request a Quote, Send a Message). Submissions post to the server function
`src/lib/submit-form.functions.ts`, which reads the endpoint URL from **`admin_settings.form_endpoint`**
using the service-role client and forwards the payload as JSON. **The endpoint URL is never sent to
the browser.**

### Setup
1. Create a form endpoint with any provider that accepts a JSON `POST`:
   - [Formspree](https://formspree.io) — `https://formspree.io/f/xxxxxxx`
   - [Basin](https://usebasin.com) — `https://usebasin.com/f/xxxxxxxx`
   - [Getform](https://getform.io) — `https://getform.io/f/xxxxxxxx`
   - [Web3Forms](https://web3forms.com), [FormSubmit](https://formsubmit.co), or your own webhook
     (Zapier/Make catch hook, n8n, a serverless function…)
2. Open `/admin` → **Form delivery** → **Form endpoint URL**, paste it, save.
3. Send a test submission from `/contact` and confirm the email arrives. Verify the sender/reply-to
   address in the provider if it asks.

### Payload shape
```json
{
  "_subject": "New quote request — Wedding Photography",
  "Name": "…", "Email": "…", "Phone": "…",
  "Service": "…", "Event date": "…", "Location": "…",
  "Hours": "…", "Budget": "…", "Details": "…"
}
```
Field names match the form labels, so provider templates and spreadsheet exports stay readable.

### Notes
- If the endpoint is blank or not `https://`, the UI accepts the submission but nothing is delivered.
  Set it before going live.
- All input is validated with zod on both sides (length caps, email format).
- To store submissions yourself instead, point the endpoint at your own webhook, or extend the
  server function with an insert into a new table (remember RLS + `GRANT`s).

---

## 10. Auth & password reset setup

Sign-in is email + password at `/auth`. Recovery flow:

1. On `/auth`, click **Forgot password?** and enter the account email.
2. Supabase Auth emails a recovery link pointing at `<your-site>/reset-password`
   (the app passes `redirectTo: ${window.location.origin}/reset-password`).
3. `src/routes/reset-password.tsx` is public, reads the recovery session from the URL and calls
   `supabase.auth.updateUser({ password })`.

**Required configuration on your Supabase project:**

- **URL Configuration** — set *Site URL* to your production origin and add
  `https://your-domain.com/reset-password` (plus `http://localhost:8080/reset-password` for dev) to
  *Redirect URLs*. Links to URLs not on this list are rejected.
- **SMTP** — Authentication → Emails → SMTP Settings. The built-in sender is rate-limited and for
  testing only; point it at Resend / Postmark / SendGrid / SES / your own SMTP.
- **Template** — Authentication → Emails → Templates → *Reset password*. Keep the
  `{{ .ConfirmationURL }}` variable; restyle everything around it.
- **Expiry / rate limits** — recovery links default to 1 hour; auth emails are hourly-rate-limited.
- Keep `/reset-password` **outside** any auth guard — it must work while signed out.

**Testing it:** request a reset with a real address, confirm the email arrives (check spam), open the
link, set a new password, and sign in with it. If the link errors with "invalid or expired", the
redirect URL is almost always missing from the allow-list.

---

## 11. SEO, sitemap & Search Console

### The SEO tab
Each row in `seo_pages` is one page path:

| Field | Used for |
| --- | --- |
| Page path | which route the record applies to (`/`, `/about`, `/gallery/wedding`, …) |
| Title tag | `<title>` — keep under 60 characters |
| Meta description | `<meta name="description">` — keep under 160 characters |
| Keywords | `<meta name="keywords">` (optional) |
| Social share title / description / image | `og:*` and `twitter:*` |
| Canonical URL | `<link rel="canonical">` and `og:url` |
| Search engines | `index, follow` or `noindex, nofollow` |

Blank fields fall back to the per-route defaults in each route file, so a half-filled record never
produces empty tags. Add a row for a new gallery category simply by entering its path.

**Default social image** — when a page's *Social share image* is blank the site falls back to
**Site & About → Default social share image** (ships as `public/placeholders/og-cover.jpg`,
1200×630). Relative paths are made absolute with `SITE_URL` from `src/lib/seo.ts`.

**Favicon** — `public/favicon.svg` is the icon logo; override per-site from **Logos → Browser tab
icon** without touching code.

Also shipped:
- `/sitemap.xml` generated at request time from the SEO records plus every gallery category, skipping
  anything marked `noindex` (`src/routes/sitemap[.]xml.tsx`).
- `public/robots.txt` allows crawlers, disallows `/admin`, `/auth`, `/review`, `/reset-password`, and
  points at the sitemap.
- JSON-LD: `LocalBusiness` on home, `CollectionPage` on category galleries, plus `Service` /
  `OfferCatalog` / `Person` schema where relevant.
- `/review` is `noindex, nofollow`.

### What the sitemap is and how you use it

`https://your-domain.com/sitemap.xml` is a machine-readable list of every public page on the site,
and — for gallery pages — every photo on that page with its caption. It is written for search
engines, not for visitors; there is no need to link to it from the site.

What it does for you:
- Tells Google/Bing which pages exist, including every gallery category, without them having to
  crawl link by link. New categories and photos show up in search faster.
- Uses the Google **image sitemap** extension, so your photos are eligible for Google Images with the
  caption as context — the main way a photographer gets found.
- Respects your **Show on Internet** toggle: any image you unticked is left out entirely, so it is
  never advertised to a crawler.
- Any page whose SEO record is set to `noindex` is left out too.

How to use it (one-time, ~5 minutes):
1. Publish the site on the domain you want indexed.
2. Open [Google Search Console](https://search.google.com/search-console), add and verify your
   property (steps below).
3. Go to **Sitemaps**, enter `sitemap.xml`, press Submit. Google re-reads it automatically from then
   on — you never resubmit after adding photos or categories.
4. Optionally repeat in [Bing Webmaster Tools](https://www.bing.com/webmasters).

Sanity check any time: open `/sitemap.xml` in a browser. Every page you expect should be listed, and
no image you hid should appear.


### Image visibility — three independent switches
Every image uploaded anywhere in the studio (single field or bulk uploader) carries its own choices:

| Toggle | Where it applies | Effect when unticked / ticked |
| --- | --- | --- |
| **Show on Internet** | Every image field: hero, category covers, gallery photos, services, before/after pairs, logos, OG images | Unticked: still visible to people browsing the site, but served with `X-Robots-Tag: noindex, noimageindex, noarchive, nosnippet` so it never appears in Google/Bing image results or link previews |
| **Show on main gallery page** | Gallery photos | Unticked: hidden from `/gallery` and its filter counts, still shown on its category page `/gallery/<category>` |
| **Private (share link only)** | Every image field | Ticked: the image does not render on the site at all — not on the gallery, not on a category page, not in the sitemap. It only appears to someone opening a share link you created with **Show private images** ticked |

The first two default to *ticked* (visible), **Private** defaults to *unticked*, for new uploads.

**Per file, never grouped.** In the bulk uploader each staged file has its own set of checkboxes; the
checkboxes in the panel header only set the default for files you add next, and **Apply first to all**
copies the choices down the list. Single-image fields show the same checkboxes, and you can set them
before the file is even uploaded — the choice is applied at upload time.

The **Image visibility** tab counts all three at a glance, plus a per-area breakdown.

#### Share links (the Flickr-style private folder link)
Studio → **Share links** → pick a category (or the whole gallery), tick or untick **Show private
images**, then **Create link**. You get a URL like `https://yoursite.com/gallery/weddings?k=<token>`.

- Anyone with the link sees that page, including the private photos when you allowed them.
- Ordinary visitors, search engines and the sitemap never see private photos.
- **Revoke** kills the link immediately; existing links keep working until you do.
- Tokens are random 128-bit values and are resolved server-side by the `resolve_share_link` database
  function, so a guessed token gets nothing.

Where it lives:
- `image_settings` table (keyed by stored file name, columns `indexable` and `is_private`) → enforced
  in `src/routes/api/public/img.$.ts`; helpers in `src/lib/image-index.ts`.
- `photos.in_gallery` and `photos.is_private` columns → filtered in `src/lib/site-content.functions.ts`
  and `src/routes/gallery.index.tsx`.
- `share_links` table + `resolve_share_link()` → read from the `?k=` query parameter in
  `src/routes/__root.tsx`.
- Hidden images are also skipped by the sitemap, so nothing links to them from outside the site.
- Flag changes take effect on the next crawl; already-indexed images can take a few weeks to drop out
  (use Search Console **Removals** to speed it up).

### Text contrast over photos
Text laid over a photograph can vanish when the picture behind it is the same tone. Studio → **Text
contrast** lists every such piece of text with a switch; flipping one adds the `.text-flip` utility
(defined in `src/styles.css`) which paints that text in the opposite colour. Stored in the
`text_inverts` table, read through `invertClass()` in `src/data/portfolio.ts`.

### Default grid columns per device
Studio → **Grid defaults**. Pick a device (Desktop / Tablet / Mobile) at the top, then set 1, 2 or 3
columns for Home (featured work), Gallery (all work) and Category pages. Visitors can still switch
using the on-page **View** selector; your setting is what they land on. Handled by the `useGridView`
hook in `src/components/site/ViewSelector.tsx`, and read from the `settings` table's `grid_*` columns.

### Site statistics
Studio → **Statistics**. Every non-studio page view is recorded anonymously in the `page_views`
table (path, a random per-browser id kept in `localStorage`, referrer, timestamp — no cookies, no
personal data). The dashboard shows totals, a views/visitors chart over the last 30 days, 12 months
or all time, the top pages as a bar chart, a full list of every page (new pages appear automatically)
and where visitors came from. Only admins can read it: `getSiteAnalytics` in
`src/lib/analytics.functions.ts` re-checks `has_role(auth.uid(), 'admin')` server-side.


### Users & roles
Studio → **Users**. Admin accounts can open the Content Studio; non-admin accounts can sign in but
see nothing. Actions run through admin-only server functions in `src/lib/users.functions.ts`, which
re-check `has_role(auth.uid(), 'admin')` on the server for every call. You cannot demote or delete
your own account (so the studio can never be locked out).

### Google Search Console (on your own host)
1. Add a **Domain** property (DNS TXT) or **URL prefix** property at
   [search.google.com/search-console](https://search.google.com/search-console).
2. For URL-prefix verification, use the *HTML tag* method and add
   `{ name: "google-site-verification", content: "<your-token>" }` to the `meta` array in
   `src/routes/__root.tsx`, redeploy, then click Verify. (Or drop the verification HTML file into
   `public/` — it is served from the root.)
3. Submit `https://your-domain.com/sitemap.xml` under **Sitemaps**.
4. **URL Inspection → Request indexing** on the home page to speed up the first crawl.
5. Repeat for Bing Webmaster Tools if you want Bing coverage (it can import from Search Console).

You do **not** need to connect Search Console inside Lovable — that integration only covers the
`*.lovable.app` preview domain.

### Still on you before launch
Real phone, email and service area under **Site & About** — they feed the visible contact block *and*
the `LocalBusiness` JSON-LD, so placeholder values are the one thing that will fail an SEO audit.

---

## 12. Design system, theming & animation

- **Tokens, not colours.** Every colour, gradient and shadow is a semantic token in `src/styles.css`
  (`--background`, `--foreground`, `--hairline`, `--glow`, …). Components never hardcode
  `text-white` / `bg-black` / hex values.
- **Palettes.** `:root` / `.dark` for dark mode, `.light` for light mode. Both use the same token
  names. The **Colours** studio tab writes `theme_tokens` rows, which `src/lib/theme-css.ts` turns
  into CSS variables injected into the document head — no flash of the wrong palette.
- **Theme switching.** Sun/moon button in the header and at the bottom of the mobile drawer. Stored
  in `localStorage` under `shutterram-theme` and applied before first paint by an inline script in
  `__root.tsx`. **Dark is the default** for first-time visitors.
- **Hero scrim.** The `.hero-scrim` utility has separate strengths per theme; light mode uses a
  deliberately lighter gradient so photographs stay visible. Home hero and category hero share it.
- **Cursor glow.** `src/components/site/CursorGlow.tsx`, mounted in `__root.tsx`. Size, edge softness
  and Photoshop-style blend mode are studio-controlled (`glow_size`, `glow_softness`, `glow_blend`),
  and its colour/opacity per theme live in the Colours tab.
- **Loader.** `PageLoader.tsx` — a small shape holding your logo with a second shape pulsing out of
  it. Shape (square/circle), inner size, pulse growth and fade direction are all studio-controlled.
- **Motion.** `Reveal.tsx` handles scroll-in fades; the testimonials rail and the mobile services
  rail loop endlessly by duplicating items and pause on hover/tap. Keep animation subtle — the
  photographs carry the page.
- **Typography.** Literata for display, Manrope for body — both overridable per section and per
  device from the **Fonts** tab (`type_tokens` → `src/lib/type-css.ts`). Sharp corners throughout;
  form fields are underlines, not boxes.
- **Grid view selector.** Anywhere the site shows a wall of photographs — Home → Featured work,
  `/gallery`, and each `/gallery/:category` — a small glyph control (`ViewSelector.tsx` +
  `useColumnView`) lets the visitor pick 1, 2 or 3 columns. **Two columns is the default on every
  device**, and the selector is shown on mobile, tablet and desktop alike: phones apply the choice as
  a CSS grid (`MOBILE_GRID_CLASS`), tablet/desktop as masonry columns (`DESKTOP_COLUMN_CLASS`, or
  `COLUMN_CLASS` on category pages).
- **Carousels.** The Services rail and the Testimonials rail loop infinitely, pause on hover/tap, and
  can be dragged/swiped left and right; the helper line under each reads "swipe or use the arrows".

---

## 13. Deployment checklist

### Content
- [ ] Real name, tagline, email, phone, location and about copy under **Site & About**.
- [ ] Hero slides: image, title, tagline and category for each; no placeholder text.
- [ ] Gallery photos uploaded and categorised; unused categories removed.
- [ ] Editing samples use **real before and after** images (the shipped BEFORE/AFTER SVGs are
      placeholders).
- [ ] Services have image, title, subtitle and description.
- [ ] Stats, experience, process steps and page-section headings reviewed and ordered.
- [ ] Real testimonials collected via `/review` and approved, or the section hidden.
- [ ] Social links point at live profiles; custom icons uploaded where needed.

### Backend
- [ ] Supabase project created; schema + RLS + `GRANT`s applied (section 5).
- [ ] Private `site-images` bucket with admin write policies.
- [ ] Admin account created, then anonymous sign-ups disabled.
- [ ] Auth *Site URL* and *Redirect URLs* include production + `/reset-password`.
- [ ] SMTP configured for auth emails.
- [ ] Database backups scheduled.

### Forms
- [ ] `admin_settings.form_endpoint` set to a live provider endpoint (section 9).
- [ ] Test submission sent from **both** the quote and message forms; emails received.

### Environment & build
- [ ] All section 6 variables set on the host (`VITE_*` at build time, secrets server-side only).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` absent from the client bundle.
- [ ] `npm run lint` and `npx tsc --noEmit` clean; `npm run build` passes.
- [ ] `npm run preview` sanity-checked.

### SEO & polish
- [ ] Every page reviewed in the **SEO** tab.
- [ ] `SITE_URL` in `src/lib/seo.ts` and the sitemap line in `public/robots.txt` use your domain.
- [ ] `/sitemap.xml` loads and lists every public page.
- [ ] Favicon and OG image resolve at absolute `https://` URLs.
- [ ] Light and dark mode checked on every page.

### Go live
- [ ] Custom domain connected, HTTPS active.
- [ ] Smoke test desktop + mobile: hero slider, lightbox (swipe + arrows), before/after sliders,
      services rail, testimonials loop, scroll-to-top, both contact forms.
- [ ] `/admin` login works on production and an edit shows on the live site.
- [ ] Password-reset email received and the new password works.
- [ ] 404 renders for an unknown URL and deep links survive a hard refresh.

---

## 14. QA test pass

Run against a **production build**, not the dev server:

```bash
npm run build && npm run preview
```

### Checks
- [ ] All routes return 200 and each has its **own** title: `/`, `/gallery`, `/services`, `/about`,
      `/contact`, `/review`; unknown URLs render the 404 page.
- [ ] Console clean on every route at 1280px and 390px (no errors, no failed requests).
- [ ] No image renders with an empty `src` — a `/placeholders/photo.svg` on the live site means a
      studio row is missing its image.
- [ ] Lightbox: opens centred, arrows sit beside the frame, CLOSE and Esc work, swipe works on
      mobile, first and last images stay in frame, portrait shots are not cropped.
- [ ] Contact defaults to **Request a Quote**; "Start a conversation" / "Work with me" open the
      message form.
- [ ] Services rail and testimonials loop endlessly and pause on hover/tap.
- [ ] `/admin` loads for an admin, every tab saves, **Refresh site** reflects the change publicly.
- [ ] Logos: change each slot and confirm header, drawer, footer, loader and favicon update.
- [ ] Review photos open in the in-page lightbox (not a new tab) and navigate.
- [ ] Signed out, `/admin` redirects to `/auth`.

### Tooling

```bash
# status codes + titles
for p in / /gallery /services /about /contact /review /does-not-exist; do
  printf "%s -> %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4173$p)"
done
curl -s http://localhost:4173/ | grep -o '<title>[^<]*</title>'
```

- **Meta / social tags** — view source: exactly one `<title>`, one `description`, one `canonical`,
  and an `og:image`. Then check the live URL in [opengraph.xyz](https://www.opengraph.xyz) and the
  [Facebook sharing debugger](https://developers.facebook.com/tools/debug/) (*Scrape Again* after
  changing an image — crawlers cache previews for days).
- **Structured data** — [Rich Results Test](https://search.google.com/test/rich-results) on `/`,
  `/services` and one gallery category.
- **Lighthouse** — mobile preset on `/`, `/gallery/wedding`, `/contact`. Target 90+ on Accessibility,
  Best Practices and SEO; Performance will be lower on image-heavy pages, which is expected.
  CLI: `npx lighthouse http://localhost:4173 --view`.
- **Responsive** — DevTools at 390 / 768 / 1280 / 1920px on every page.
- **Broken links** — `npx linkinator http://localhost:4173 --recurse --skip "mailto:|tel:"`.
- **Gates** — `npm run lint` and `npx tsc --noEmit`.
- **Email** — submit both contact forms and the review form with a real address, confirm delivery,
  then approve the review and confirm it appears.
- **Backend** — run a security scan (or `supabase db lint`) and confirm no table exposes data it
  shouldn't.

Adjust the port above if `npm run preview` reports a different one.

---

## 15. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Site shows old/default text everywhere | The content load failed and defaults rendered. Check `VITE_SUPABASE_*` vars and that public `SELECT` grants exist. |
| "permission denied for table …" | Missing `GRANT` for `anon` / `authenticated`. RLS alone is not enough with PostgREST. |
| Testimonials query fails | Someone used `select("*")`. The `email` column is revoked — select explicit columns. |
| Contact form succeeds but no email | `admin_settings.form_endpoint` is blank or not `https://`. Set it in **Form delivery**. |
| Reset link says invalid/expired | The redirect URL isn't in Supabase *Redirect URLs*, or the 1-hour expiry passed. |
| Reset emails never arrive | Built-in SMTP is rate-limited — configure real SMTP. |
| Studio saves but the site doesn't change | Press **Refresh site**, or hard-reload; SSR caches the payload per request. |
| Images 404 | The `site-images` bucket is private by design — they must be served via `/api/public/img/<key>`. |
| OG preview shows the old image | Crawlers cache. Re-scrape in the platform's debugger. |
| Wrong canonical domain in tags | Update `SITE_URL` in `src/lib/seo.ts` and rebuild. |
| Env change had no effect | `VITE_*` values are compiled in — rebuild, don't just restart. |
| Build fails with "Unauthorized" | A protected server function is being called from a public route loader. Move it into the component or under `_authenticated`. |

---

## 16. Extending the site

- **A new editable string** — add a row in **Wording**, then `t("key", "fallback")` in the component.
- **A new page** — create `src/routes/<name>.tsx` with `createFileRoute` and its own `head()`
  (unique title, description, `og:*`, canonical), add a `seo_pages` row, and add it to the header nav
  (the nav labels are editable in **Wording**).
- **A new section** — build the component, add a `page_sections` row with a new `section_key`, and
  render it via `sectionFor(page, key)` so it can be reordered/hidden from the studio.
- **A new content type** — create the table with `GRANT`s + RLS in one migration, add it to
  `site-content.functions.ts` (explicit columns), map it in `applyContent()`, and add a studio tab in
  `src/routes/_authenticated/admin.tsx`.
- **A new gallery category** — just add it from the Category dropdown; the route and sitemap pick it
  up automatically.
- **External integrations** — internal logic goes in `createServerFn`; webhooks and public APIs go in
  `src/routes/api/public/*` and must verify the caller inside the handler.

---

## 17. Long-term maintenance & operations

This section is for the months and years *after* launch — everything you need to keep the site
healthy, safe and changeable without help.

### 17.1 Routine rhythm

| Frequency | Task |
| --- | --- |
| Weekly | Approve/decline new client reviews in **Client reviews**; skim the contact inbox to confirm forms still deliver |
| Monthly | Send one test submission from each contact form; open the site on a phone and a desktop; check `/sitemap.xml` still lists every page |
| Quarterly | Refresh gallery photos and featured selections; review SEO titles/descriptions; check Search Console coverage & Core Web Vitals; export a database backup |
| Yearly | Renew the domain; rotate the admin password; review Supabase and host billing/plan limits; run a dependency update (17.4) |
| After any content push | Press **Refresh site** in the studio, then hard-reload a public page to confirm the change is live |

### 17.2 Backups and restore

Two things must be backed up — they are **separate**:

1. **The database** (all your text, settings, SEO, colours, fonts, reviews).
   - Supabase → Database → Backups gives daily automated backups on paid plans.
   - A manual, portable copy any time:
     ```sh
     pg_dump "postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres" \
       --no-owner --no-privileges -Fc -f shutterram-$(date +%F).dump
     ```
   - Restore into a fresh project with:
     ```sh
     pg_restore --no-owner --no-privileges -d "<new connection string>" shutterram-<date>.dump
     ```
     Then re-apply the `GRANT`s and RLS policies from section 5 if the dump was schema-light.
2. **Storage objects** (every uploaded photo, logo and icon) — these are **not** in a SQL dump.
   Download the `site-images` bucket from the Supabase Storage UI, or sync it with the
   Storage API / `supabase storage` CLI. Keep the original full-resolution photographs on your own
   drive as well; the site stores optimised WebP copies, not masters.

**Test a restore at least once.** A backup you have never restored is a hope, not a backup.

### 17.3 Keys, passwords and access

- **Publishable / anon key** — safe in the browser bundle. Rotating it requires a rebuild.
- **Service-role key** — bypasses all security. Server-side environment variable only. If it is ever
  pasted into client code, a screenshot, or a chat, rotate it immediately in Supabase → API keys and
  update the host's env var.
- **Admin account** — the first account created holds the `admin` role in `user_roles`. Add another
  admin by inserting a row for that user's `id`; remove access by deleting the row (deleting the auth
  user is cleaner). Keep **anonymous sign-ups disabled** permanently.
- **Password reset** depends on your SMTP credentials staying valid — providers expire API keys.
  If reset emails stop arriving, check SMTP before anything else.
- Never commit `.env`. Host env vars are the source of truth in production.

### 17.4 Updating dependencies safely

```sh
npm outdated              # see what moved
npm update                # safe, semver-compatible bumps
npm run lint && npx tsc --noEmit && npm run build
npm run preview           # click through every page before deploying
```

Rules that keep this painless:
- Bump **one** major version at a time (React, TanStack, Tailwind, Supabase are the four that matter)
  and test between each.
- Do **not** add another router. TanStack Router is structural to this app.
- Tailwind v4 has no `tailwind.config.js` — tokens live in `src/styles.css`. Ignore any advice that
  tells you to create one.
- `src/routeTree.gen.ts` and everything in `src/integrations/supabase/` are generated. Never hand-edit;
  they regenerate on build.
- Keep a deploy you can roll back to (git tag, or your host's previous deployment).

### 17.5 Monitoring & performance

- **Uptime** — point a free monitor (UptimeRobot, Better Stack) at `https://your-domain.com` and at
  `/sitemap.xml` (the second proves the database is reachable, not just the CDN).
- **Errors** — the SSR entry (`src/server.ts`) converts crashes into a styled error page and logs the
  real error to your host's log stream. Check the host's logs when something looks wrong.
- **Speed** — images dominate. Keep uploads under ~2400px (the studio enforces this), prefer WebP,
  and don't put twenty full-bleed photos in one section. Run PageSpeed Insights after big galleries.
- **Database size** — text tables stay tiny; storage is what grows. Delete photo rows *and* their
  files when retiring old work.

### 17.6 Changing things later — where to start

| I want to… | Do this |
| --- | --- |
| Change any visible word | Studio → **Wording** (or the section's row in **Page sections**) |
| Add / remove a gallery category | Studio → **Hero categories** or the Category dropdown on Photos; route, cover, sitemap and SEO row follow automatically |
| Re-order or hide a homepage section | Studio → **Page sections** (↑ ↓ and *Show on site*) |
| Change colours or the mobile-menu background | Studio → **Colours** (undo/redo per token) |
| Change a font size on phones only | Studio → **Fonts** → that section's *mobile* column |
| Swap a logo or favicon | Studio → **Logos** |
| Change where contact forms go | Studio → **Form delivery** |
| Change a page's title/description/share image | Studio → **SEO** |
| Move to a new domain | Update `SITE_URL` in `src/lib/seo.ts`, the `Sitemap:` line in `public/robots.txt`, Supabase Auth *Site URL* + *Redirect URLs*, then rebuild and redeploy |
| Add a whole new page or content type | Section 16 — this needs code |

### 17.7 Handing the project to another developer

Give them: this README, repository access, the Supabase project (or a dump + storage export), the
host account, and the domain registrar login. Point them at section 2 (layout), section 3 (content
flow) and section 5 (schema + RLS) first — those three explain 90% of the codebase. Everything else
is conventional React.

---

## 18. Quick reference — "where do I change X?"

| Thing | Location |
| --- | --- |
| Site URL used for canonical / OG / sitemap | `src/lib/seo.ts` → `SITE_URL` |
| Crawler rules | `public/robots.txt` |
| Sitemap generation | `src/routes/sitemap[.]xml.tsx` |
| Design tokens & palettes | `src/styles.css` (studio-overridable via `theme_tokens`) |
| Typography variables | `src/lib/type-css.ts` (studio-driven via `type_tokens`) |
| Fallback content when the DB is down | `src/data/portfolio.defaults.ts` |
| Content loading | `src/lib/site-content.functions.ts` → `applyContent()` in `src/data/portfolio.ts` |
| Contact form delivery | `src/lib/submit-form.functions.ts` + `admin_settings.form_endpoint` |
| Review submission | `src/lib/submit-review.functions.ts` |
| Image optimisation limits | `src/lib/optimise-image.ts` (`MAX_EDGE`, `QUALITY`) |
| Private-bucket image proxy | `src/routes/api/public/img.$.ts` |
| Studio tabs | `src/routes/_authenticated/admin.tsx` |
| Floating save bar | `src/components/admin/FloatingSaveBar.tsx` |
| Grid/column view selector | `src/components/site/ViewSelector.tsx` |
| Auth gate | `src/routes/_authenticated/route.tsx` |
| Global head defaults, fonts, theme script | `src/routes/__root.tsx` |
