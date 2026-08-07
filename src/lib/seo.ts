import type { SeoRow } from "./seo.server";

export const SITE_URL = "https://shutterram.lovable.app";

export type SeoFallback = {
  path: string;
  title: string;
  description: string;
  image?: string;
  type?: string;
  robots?: string;
};

type MetaTag = Record<string, string>;

/**
 * Builds a full head() payload from the studio-managed SEO row, falling back to
 * sensible per-page defaults whenever a field is left blank in the studio.
 */
export function buildSeoHead(row: SeoRow | null | undefined, fallback: SeoFallback) {
  const pick = (value: string | undefined, alt: string) =>
    value && value.trim() !== "" ? value.trim() : alt;

  const title = pick(row?.title, fallback.title);
  const description = pick(row?.description, fallback.description);
  const ogTitle = pick(row?.og_title, title);
  const ogDescription = pick(row?.og_description, description);
  const image = pick(row?.og_image, fallback.image ?? "");
  const canonical = pick(row?.canonical, `${SITE_URL}${fallback.path === "/" ? "" : fallback.path}`);
  const robots = pick(row?.robots, fallback.robots ?? "index, follow");
  const keywords = pick(row?.keywords, "");

  const meta: MetaTag[] = [
    { title },
    { name: "description", content: description },
    { name: "robots", content: robots },
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: ogDescription },
    { property: "og:type", content: fallback.type ?? "website" },
    { property: "og:url", content: canonical },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: ogTitle },
    { name: "twitter:description", content: ogDescription },
  ];

  if (keywords) meta.push({ name: "keywords", content: keywords });
  if (image) {
    const absolute = image.startsWith("http") ? image : `${SITE_URL}${image}`;
    meta.push({ property: "og:image", content: absolute });
    meta.push({ name: "twitter:image", content: absolute });
  }

  return { meta, links: [{ rel: "canonical", href: canonical }] };
}

/**
 * Loads the studio SEO row without ever failing the route: a network hiccup or
 * offline preview should fall back to the built-in defaults, not a blank screen.
 */
export async function loadSeo(path: string): Promise<SeoRow | null> {
  const { getSeo } = await import("./seo.functions");
  try {
    return (await getSeo({ data: { path } })) ?? null;
  } catch {
    return null;
  }
}
