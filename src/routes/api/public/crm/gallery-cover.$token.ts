import { createFileRoute } from "@tanstack/react-router";

/** Serves the uploaded cover picture shown at the top of a client gallery. */
export const Route = createFileRoute("/api/public/crm/gallery-cover/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token.slice(0, 64);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { GALLERY_BUCKET } = await import("@/lib/gallery.server");
        const { data: gallery } = await supabaseAdmin
          .from("crm_galleries")
          .select("cover_path,status")
          .eq("token", token)
          .maybeSingle();
        if (!gallery?.cover_path || gallery.status === "draft" || gallery.status === "archived") {
          return new Response("Not found", { status: 404 });
        }
        const file = await supabaseAdmin.storage.from(GALLERY_BUCKET).download(gallery.cover_path);
        if (file.error || !file.data) return new Response("Not found", { status: 404 });
        return new Response(await file.data.arrayBuffer(), {
          headers: {
            "Content-Type": gallery.cover_path.toLowerCase().endsWith(".jpg")
              ? "image/jpeg"
              : file.data.type || "image/jpeg",
            "Cache-Control": "public, max-age=21600, s-maxage=21600",
          },
        });
      },
    },
  },
});
