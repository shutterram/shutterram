import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/img/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const path = (params as { _splat?: string })._splat;
        if (!path) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: flags } = await supabaseAdmin
          .from("image_settings")
          .select("indexable,is_private")
          .eq("path", path)
          .maybeSingle();

        const indexable = flags?.indexable ?? true;
        const isPrivate = (flags as { is_private?: boolean } | null)?.is_private ?? false;

        if (isPrivate) {
          const token = new URL(request.url).searchParams.get("k")?.slice(0, 80) ?? "";
          if (!token) return new Response("Not found", { status: 404 });

          const { data: resolved } = await supabaseAdmin.rpc("resolve_share_link" as never, {
            _token: token,
          } as never);
          const share = (resolved as unknown as
            | { scope: string; category_slug: string; include_private: boolean }[]
            | null)?.[0];
          if (!share?.include_private) return new Response("Not found", { status: 404 });

          if (share.scope !== "gallery") {
            // Category-scoped links only unlock photos inside that category.
            const { data: photo } = await supabaseAdmin
              .from("photos")
              .select("category_slug")
              .like("src", `%/api/public/img/${path}`)
              .maybeSingle();
            if (!photo || photo.category_slug !== share.category_slug) {
              return new Response("Not found", { status: 404 });
            }
          }
        }

        const { data, error } = await supabaseAdmin.storage.from("site-images").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });

        return new Response(await data.arrayBuffer(), {
          headers: {
            "content-type": data.type || "application/octet-stream",
            "cache-control": isPrivate
              ? "private, no-store"
              : "public, max-age=31536000, immutable",
            ...(indexable && !isPrivate
              ? {}
              : { "x-robots-tag": "noindex, noimageindex, noarchive, nosnippet" }),
          },
        });
      },
    },
  },
});
