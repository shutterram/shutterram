import { SITE_URL } from "./seo";

export interface ShortLinkTarget {
  /** Absolute or root-relative URL the visitor should land on. */
  target: string;
  ogImage: string;
  label: string;
}

/** Where a share link points, before the tracking token is attached. */
function shareLinkPath(row: { scope: string; category_slug: string; path: string }): string {
  if (row.scope === "category") return `/gallery/${row.category_slug}`;
  if (row.scope === "page") return row.path || "/";
  return "/gallery";
}

/**
 * Resolves a short code to its destination. Share links keep their private
 * access token in the URL; plain shortened links carry the code itself so
 * visits still show up in the statistics tab.
 */
export async function resolveShortCode(code: string): Promise<ShortLinkTarget | null> {
  if (!code) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: share } = await supabaseAdmin
    .from("share_links")
    .select("token,label,scope,category_slug,path,og_image")
    .eq("code", code)
    .maybeSingle();

  if (share) {
    const row = share as {
      token: string;
      label: string;
      scope: string;
      category_slug: string;
      path: string;
      og_image: string;
    };
    const path = shareLinkPath(row);
    return {
      target: `${path}${path.includes("?") ? "&" : "?"}k=${row.token}`,
      ogImage: row.og_image ?? "",
      label: row.label ?? "",
    };
  }

  const { data: short } = await supabaseAdmin
    .from("short_links")
    .select("target_url,og_image,label")
    .eq("code", code)
    .maybeSingle();

  if (!short) return null;
  const row = short as { target_url: string; og_image: string; label: string };
  let target = (row.target_url ?? "").trim();
  if (!target) return null;

  // Keep same-site destinations tracked under this short code.
  const sameSite = target.startsWith("/") || target.startsWith(SITE_URL);
  if (sameSite) target += `${target.includes("?") ? "&" : "?"}k=${code}`;

  return { target, ogImage: row.og_image ?? "", label: row.label ?? "" };
}
