import { createFileRoute } from "@tanstack/react-router";

/** Public social-card image for a live client gallery. */
export const Route = createFileRoute("/api/public/crm/gallery-og/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token.slice(0, 64);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { GALLERY_BUCKET } = await import("@/lib/gallery.server");
        const { data: gallery } = await supabaseAdmin
          .from("crm_galleries")
          .select("cover_url,status")
          .eq("token", token)
          .maybeSingle();
        if (!gallery?.cover_url || gallery.status === "draft" || gallery.status === "archived") {
          return new Response("Not found", { status: 404 });
        }
        const file = await supabaseAdmin.storage.from(GALLERY_BUCKET).download(gallery.cover_url);
        if (file.error || !file.data) return new Response("Not found", { status: 404 });
        return new Response(await file.data.arrayBuffer(), {
          headers: {
            "Content-Type": gallery.cover_url.toLowerCase().endsWith(".jpg")
              ? "image/jpeg"
              : file.data.type || "image/jpeg",
            "Cache-Control": "public, max-age=21600, s-maxage=21600",
          },
        });
      },
    },
  },
});
