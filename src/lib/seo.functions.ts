import { createServerFn } from "@tanstack/react-start";
import { fetchSeo } from "./seo.server";
import type { SeoRow } from "./seo.server";

/** Public read of the studio-managed SEO record for one page path. */
export const getSeo = createServerFn({ method: "GET" })
  .inputValidator((data: { path: string }) => ({ path: String(data?.path ?? "/") }))
  .handler(async ({ data }): Promise<SeoRow | null> => fetchSeo(data.path));
