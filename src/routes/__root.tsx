import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ScrollToTop } from "@/components/site/ScrollToTop";
import { Toaster } from "@/components/ui/sonner";
import { getSiteContent } from "@/lib/site-content.functions";
import { applyContent, logos } from "@/data/portfolio";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-4 font-display text-5xl">Frame not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This page doesn't exist or has been moved.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center border border-foreground px-8 py-3 text-[0.6875rem] tracking-[0.28em] uppercase transition-colors hover:bg-foreground hover:text-background"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center border border-foreground bg-foreground px-6 py-2.5 text-[0.6875rem] tracking-[0.24em] uppercase text-background"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center border border-hairline px-6 py-2.5 text-[0.6875rem] tracking-[0.24em] uppercase"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Shutter Ram: Wedding, Portrait & Corporate Photography" },
      {
        name: "description",
        content:
          "Shutter Ram is a one-person photography studio covering weddings, corporate brands, portraits and headshots. Capturing your tomorrow's memories today.",
      },
      { name: "author", content: "Shutter Ram" },
      { property: "og:site_name", content: "Shutter Ram" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Shutter Ram: Wedding, Portrait & Corporate Photography" },
      { name: "twitter:title", content: "Shutter Ram: Wedding, Portrait & Corporate Photography" },
      {
        property: "og:description",
        content:
          "Shutter Ram is a one-person photography studio covering weddings, corporate brands, portraits and headshots. Capturing your tomorrow's memories today.",
      },
      {
        name: "twitter:description",
        content:
          "Shutter Ram is a one-person photography studio covering weddings, corporate brands, portraits and headshots. Capturing your tomorrow's memories today.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1d29a2d5-8daf-4219-a782-0396fe1db0ba/id-preview-15a9fbfa--45f3e6db-80e3-4769-9011-011ab2cc627f.lovable.app-1785754525360.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1d29a2d5-8daf-4219-a782-0396fe1db0ba/id-preview-15a9fbfa--45f3e6db-80e3-4769-9011-011ab2cc627f.lovable.app-1785754525360.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,300;7..72,400;7..72,500;7..72,600&family=Manrope:wght@300;400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  loader: () => getSiteContent(),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const content = Route.useLoaderData();
  applyContent(content);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Swap the browser tab icon when a custom favicon is set in the studio.
  const favicon = logos.favicon;
  useEffect(() => {
    if (!favicon) return;
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = favicon;
  }, [favicon]);

  // The private studio pages render without the public site chrome.
  const isStudio =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/reset-password");

  return (
    <QueryClientProvider client={queryClient}>
      {isStudio ? null : <SiteHeader />}
      <main key={pathname} className="page-in min-h-screen">
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </main>
      {isStudio ? null : <SiteFooter />}
      {isStudio ? null : <ScrollToTop />}
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}
