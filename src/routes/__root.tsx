import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  ScriptOnce,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ScrollToTop } from "@/components/site/ScrollToTop";
import { CursorGlow } from "@/components/site/CursorGlow";
import { Toaster } from "@/components/ui/sonner";
import { getSiteContent } from "@/lib/site-content.functions";
import { applyContent, logos, themeTokens, typeTokens, typography } from "@/data/portfolio";
import { themeCss } from "@/lib/theme-css";
import { googleFontsHref, typographyCss } from "@/lib/type-css";

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
      { name: "author", content: "Shutter Ram" },
      { property: "og:site_name", content: "Shutter Ram" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      // Titles, descriptions and social preview copy are owned by each leaf
      // route's buildSeoHead() so every page emits unique metadata.
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ScriptOnce>
          {`try{var t=localStorage.getItem('shutterram-theme')==='light'?'light':'dark';var r=document.documentElement;r.classList.toggle('light',t==='light');r.classList.toggle('dark',t==='dark');r.style.colorScheme=t;}catch(e){}`}
        </ScriptOnce>
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
  const paletteCss = themeCss(themeTokens);
  const typeCss = typographyCss(typeTokens, typography);
  const fontsHref = googleFontsHref(typography);

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
      {fontsHref ? <link rel="stylesheet" href={fontsHref} precedence="high" /> : null}
      {paletteCss ? <style dangerouslySetInnerHTML={{ __html: paletteCss }} /> : null}
      {typeCss ? <style dangerouslySetInnerHTML={{ __html: typeCss }} /> : null}
      {isStudio ? null : <SiteHeader />}
      <main key={pathname} className="page-in min-h-screen">
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </main>
      {isStudio ? null : <SiteFooter />}
      {isStudio ? null : <ScrollToTop />}
      {isStudio ? null : <CursorGlow />}
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}
