import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/seo";

const STATIC_PATHS = ["/", "/gallery", "/services", "/about", "/contact"];

/** Dynamic sitemap: static pages plus every gallery category. */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { fetchAllSeo } = await import("@/lib/seo.server");
        const { fetchCategoryPaths } = await import("@/lib/sitemap.server");

        const [seo, categoryPaths] = await Promise.all([
          fetchAllSeo().catch(() => []),
          fetchCategoryPaths().catch(() => [] as string[]),
        ]);

        const hidden = new Set(
          seo.filter((row) => (row.robots || "").includes("noindex")).map((row) => row.path),
        );

        const paths = [...new Set([...STATIC_PATHS, ...categoryPaths])].filter(
          (path) => !hidden.has(path),
        );

        const today = new Date().toISOString().slice(0, 10);
        const urls = paths
          .map((path) => {
            const loc = `${SITE_URL}${path === "/" ? "" : path}`;
            const priority = path === "/" ? "1.0" : path.startsWith("/gallery/") ? "0.7" : "0.8";
            return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
          })
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
