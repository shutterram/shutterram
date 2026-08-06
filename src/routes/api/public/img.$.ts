import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/img/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat;
        if (!path) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const [{ data, error }, flag] = await Promise.all([
          supabaseAdmin.storage.from("site-images").download(path),
          supabaseAdmin
            .from("image_settings")
            .select("indexable")
            .eq("path", path)
            .maybeSingle(),
        ]);
        if (error || !data) return new Response("Not found", { status: 404 });

        const indexable = flag.data?.indexable ?? true;

        return new Response(await data.arrayBuffer(), {
          headers: {
            "content-type": data.type || "application/octet-stream",
            "cache-control": "public, max-age=31536000, immutable",
            ...(indexable
              ? {}
              : { "x-robots-tag": "noindex, noimageindex, noarchive, nosnippet" }),
          },
        });

      },
    },
  },
});
