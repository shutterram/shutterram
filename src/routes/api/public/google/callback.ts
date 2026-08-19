import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code") ?? "";
        const state = url.searchParams.get("state") ?? "";
        const back = (msg: string) =>
          new Response(null, {
            status: 302,
            headers: { Location: `/crm?drive=${encodeURIComponent(msg)}#settings` },
          });

        if (!code || !state) return back("cancelled");

        const { verifyState, exchangeCode } = await import("@/lib/google-drive.server");
        const payload = await verifyState(state);
        if (!payload) return back("invalid");

        const [userId, , redirectUri] = payload.split("|");
        try {
          await exchangeCode(code, redirectUri ?? "", userId ?? null);
        } catch (error) {
          console.error("[drive] oauth exchange failed", error);
          return back("failed");
        }
        return back("connected");
      },
    },
  },
});
