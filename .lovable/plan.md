# Restore production analytics ingestion

## Confirmed diagnosis

The live production site is invoking the analytics server function successfully, but it returns `{ ok: false, id: "" }`, and the database has received no new page-view rows since August 7.

The write currently ends with `.select("id").single()`. That asks the anonymous database role to read the inserted analytics row back. The database intentionally permits anonymous inserts but restricts analytics reads to admins, so row-level security rejects the operation. This is why changing deployment environment variables did not solve it.

## Implementation

1. **Fix page-view writes without weakening security**
   - Generate the page-view UUID inside the server function.
   - Include that UUID in the insert and use a minimal/no-return insert instead of `.select("id")`.
   - Return the generated UUID only after a successful write, preserving duration tracking while keeping analytics rows unreadable to anonymous visitors.
   - Keep the existing admin-only analytics read policy unchanged.

2. **Make failures diagnosable**
   - Preserve safe server-side error logging with the database error code/message.
   - Keep the browser call non-blocking, but ensure the server result accurately reports failed writes.

3. **Keep server-function modules deployment-safe**
   - Move runtime helpers/constants used by analytics into a server-safe helper module so the `createServerFn` file remains a thin declaration wrapper.
   - Preserve the current public tracking, duration, and admin dashboard behavior.

4. **Resolve the active hero hydration mismatch**
   - Stabilize the initial hero slide markup so server and browser render the same first frame before effects begin.
   - Do not change the hero’s appearance or interaction.

## Verification

- Reproduce an anonymous production-style page-view insert and confirm it returns a non-empty ID.
- Verify a new row appears with path, visitor ID, device, and geography fields.
- Navigate between public pages and confirm page counts increase.
- Leave/navigate away from a page and confirm duration updates when the server secret is available.
- Confirm an anonymous client still cannot read `page_views`.
- Check the Statistics panel across short and long ranges.
- Verify the home page hydrates without the current HeroSlider mismatch.

## Deployment note

This fix requires a code redeploy only; it does not require broadening database permissions. After the Git push, redeploy the production build and test with a fresh visit to the live domain.
