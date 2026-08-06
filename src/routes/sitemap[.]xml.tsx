import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/seo";

const STATIC_PATHS = ["/", "/gallery", "/services", "/about", "/contact"];

/** Dynamic sitemap: static pages plus every gallery category. */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { fetchAllSeo } = await import("@/lib/seo.server");
        const { fetchCategoryPaths, fetchIndexableImages } = await import("@/lib/sitemap.server");

        const [seo, categoryPaths, images] = await Promise.all([
          fetchAllSeo().catch(() => []),
          fetchCategoryPaths().catch(() => [] as string[]),
          fetchIndexableImages().catch(() => ({}) as Record<string, { src: string; caption: string }[]>),
        ]);

        const hidden = new Set(
          seo.filter((row) => (row.robots || "").includes("noindex")).map((row) => row.path),
        );

        const paths = [...new Set([...STATIC_PATHS, ...categoryPaths])].filter(
          (path) => !hidden.has(path),
        );

        const esc = (value: string) =>
          value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

        const urls = paths
          .map((path) => {
            const loc = `${SITE_URL}${path === "/" ? "" : path}`;
            const priority = path === "/" ? "1.0" : path.startsWith("/gallery/") ? "0.7" : "0.8";
            const imageTags = (images[path] ?? [])
              .map(
                (img) =>
                  `    <image:image>\n      <image:loc>${esc(img.src.startsWith("http") ? img.src : `${SITE_URL}${img.src}`)}</image:loc>${
                    img.caption ? `\n      <image:caption>${esc(img.caption)}</image:caption>` : ""
                  }\n    </image:image>`,
              )
              .join("\n");
            return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>${imageTags ? `\n${imageTags}` : ""}\n  </url>`;
          })
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`;


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
