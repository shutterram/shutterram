import { createFileRoute } from "@tanstack/react-router";

/**
 * Public social-card image for a live client gallery.
 * Crawlers keep re-fetching this URL long after a share, so it must be a
 * plain, unsigned, never-expiring address: either the uploaded custom cover
 * or the chosen gallery photo's preview.
 */
export const Route = createFileRoute("/api/public/crm/gallery-og/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token.slice(0, 64);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { GALLERY_BUCKET } = await import("@/lib/gallery.server");
        const { data: gallery } = await supabaseAdmin
          .from("crm_galleries")
          .select("cover_url,og_image_id,status")
          .eq("token", token)
          .maybeSingle();
        if (!gallery || gallery.status === "draft" || gallery.status === "archived") {
          return new Response("Not found", { status: 404 });
        }

        const headers = (type: string) => ({
          "Content-Type": type,
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        });

        if (gallery.cover_url) {
          const file = await supabaseAdmin.storage.from(GALLERY_BUCKET).download(gallery.cover_url);
          if (!file.error && file.data) {
            return new Response(await file.data.arrayBuffer(), {
              headers: headers(
                gallery.cover_url.toLowerCase().endsWith(".jpg")
                  ? "image/jpeg"
                  : file.data.type || "image/jpeg",
              ),
            });
          }
        }

        if (gallery.og_image_id) {
          const { data: image } = await supabaseAdmin
            .from("crm_gallery_images")
            .select("preview_path,thumb_path,drive_file_id")
            .eq("id", gallery.og_image_id)
            .maybeSingle();
          const path = image?.preview_path || image?.thumb_path;
          if (path) {
            const file = await supabaseAdmin.storage.from(GALLERY_BUCKET).download(path);
            if (!file.error && file.data) {
              return new Response(await file.data.arrayBuffer(), {
                headers: headers(
                  path.toLowerCase().endsWith(".jpg") ? "image/jpeg" : file.data.type || "image/jpeg",
                ),
              });
            }
          }
          if (image?.drive_file_id) {
            const { fetchDriveThumbnail } = await import("@/lib/google-drive.server");
            const res = await fetchDriveThumbnail(image.drive_file_id);
            if (res) {
              return new Response(res.body, {
                headers: headers(res.headers.get("content-type") ?? "image/jpeg"),
              });
            }
          }
        }

        return new Response("Not found", { status: 404 });
      },
    },
  },
});
