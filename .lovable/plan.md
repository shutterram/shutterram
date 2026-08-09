# Your own Supabase + the analytics fix

You asked to connect your own Supabase and to hold the code fix until you're ready. Here's what's true today and what happens once you say go.

## What I found

- This project already has a working backend attached, and it holds your real traffic — I queried it and saw genuine page views from August 7 (paths, devices, US/SE visitors).
- Your live site at `www.shutterram.com` is served by Vercel and **is** calling the tracking function successfully.
- Tracking still fails at the last step. I reproduced an anonymous visit write against the live database and got:
  `new row violates row-level security policy for table "page_views"`.

The cause is in the code, not your credentials. The tracking write ends by asking the database to hand the new row back. Anonymous visitors are deliberately allowed to *record* analytics but never to *read* it, so the database rejects the whole write. That's why updating environment variables changed nothing.

## About connecting your own Supabase

The editor's backend is managed and cannot be detached or repointed from in here. So there are two realistic shapes — tell me which you want:

- **Recommended:** keep one backend for both. Your production already points at the same project, so your studio, photos, reviews and statistics stay in one place. Nothing to migrate.
- **Separate production backend:** you run your own Supabase project for the live site. That means applying all migrations there, re-uploading images, recreating your admin login, and accepting that the editor and production hold different content and separate statistics.

I'd suggest the first unless you specifically want production data isolated from Lovable.

## The fix (applied when you give the word)

1. Generate the page-view identifier inside the server function instead of asking the database to return it, and write the row without a read-back. This keeps analytics unreadable to visitors — no permissions are loosened.
2. Return that identifier only after a confirmed write, so time-on-page tracking keeps working.
3. Keep clear server-side logging so any future write failure is visible instead of silent.
4. Move analytics helper code into a server-only module so the deployed build stays reliable.
5. Resolve a hero-image rendering mismatch on the home page. No visual change.

## How I'll verify

- Perform an anonymous visit write and confirm a new row appears with path, device and country.
- Browse public pages and confirm counts rise.
- Confirm visitors still cannot read analytics data.
- Check the Statistics panel across short and long ranges.

## Deploying it

Code change only — no database migration, no permission changes. Push to GitHub, let Vercel rebuild, then load the live site and the new visit will appear in Statistics.

## Technical notes

- Root cause: `.select("id").single()` on the insert in `src/lib/analytics.functions.ts` forces a `SELECT` under the `anon` role, which the admin-only read policy on `public.page_views` denies.
- Fix: client-side `crypto.randomUUID()` for the row id, insert with no representation returned, return the id from the function.
- The `Admins can read page views` policy and all existing grants stay exactly as they are.
