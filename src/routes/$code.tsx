import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getShortLink } from "@/lib/short-links.functions";
import { SITE_URL } from "@/lib/seo";

/**
 * Short links — a single-segment URL such as /a2kh3 resolves to its real
 * destination. Crawlers get the preview tags from head(); people are sent on
 * to the page immediately.
 */
export const Route = createFileRoute("/$code")({
  loader: async ({ params }) => {
    const link = await getShortLink({ data: { code: params.code } });
    return { link, code: params.code };
  },
  head: ({ loaderData }) => {
    const link = loaderData?.link;
    const title = link?.label?.trim() ? link.label.trim() : "Shutter Ram";
    const description =
      link?.description || "View and choose your photographs from your private gallery.";
    const image = link?.ogImage
      ? link.ogImage.startsWith("http")
        ? link.ogImage
        : `${SITE_URL}${link.ogImage}`
      : "";
    const meta: Record<string, string>[] = [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
    }
    return { meta };
  },
  component: ShortLinkRedirect,
});

function ShortLinkRedirect() {
  const { link } = Route.useLoaderData();

  useEffect(() => {
    if (link?.target) window.location.replace(link.target);
  }, [link?.target]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <div className="space-y-4">
        <h1 className="text-lg tracking-[0.24em] uppercase">
          {link?.target ? "Taking you there…" : "Link not found"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {link?.target
            ? "One moment while we open the page."
            : "This link has been revoked or never existed."}
        </p>
        {link?.target ? (
          <a href={link.target} className="text-sm underline underline-offset-4">
            Continue
          </a>
        ) : (
          <Link to="/" className="text-sm underline underline-offset-4">
            Go to the home page
          </Link>
        )}
      </div>
    </main>
  );
}
