import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PageLoader } from "./components/site/PageLoader";
import { SiteErrorScreen } from "./components/site/SiteErrorScreen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: PageLoader,
    defaultPendingMs: 300,
    defaultPendingMinMs: 400,
    defaultErrorComponent: SiteErrorScreen,
  });

  return router;
};
