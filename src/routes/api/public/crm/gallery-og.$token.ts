import { createFileRoute } from "@tanstack/react-router";

/**
 * Public social-card image for a live client gallery.
 * Crawlers keep re-fetching this URL long after a share, so it must be a
 * plain, unsigned, never-expiring address: either the uploaded custom cover
 * or the chosen gallery photo's preview.
 *
 * Chat apps (WhatsApp especially) silently drop link images above roughly
 * 600KB, so a heavy preview is swapped for the small thumbnail instead.
 */
const MAX_CARD_BYTES = 600_000;

const headers = (type: string) => ({
  "Content-Type": type,
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
});

const typeFor = (path: string, fallback: string) =>
  path.toLowerCase().endsWith(".png") ? "image/png" : fallback || "image/jpeg";

export const Route = createFileRoute("/api/public/crm/gallery-og/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token.slice(0, 64);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { GALLERY_BUCKET } = await import("@/lib/gallery.server");

        /** Downloads the first candidate that is small enough to be shown as a card. */
        const serve = async (paths: (string | null | undefined)[]) => {
          let heavy: { bytes: ArrayBuffer; type: string } | null = null;
          for (const path of paths) {
            if (!path) continue;
            const file = await supabaseAdmin.storage.from(GALLERY_BUCKET).download(path);
            if (file.error || !file.data) continue;
            const bytes = await file.data.arrayBuffer();
            const type = typeFor(path, file.data.type);
            if (bytes.byteLength <= MAX_CARD_BYTES) {
              return new Response(bytes, { headers: headers(type) });
            }
            heavy ??= { bytes, type };
          }
          return heavy ? new Response(heavy.bytes, { headers: headers(heavy.type) }) : null;
        };

        const { data: gallery } = await supabaseAdmin
          .from("crm_galleries")
          .select("id,cover_url,og_image_id,status")
          .eq("token", token)
          .maybeSingle();
        // Draft galleries can still be deliberately shared through their private
        // token. Password/PIN/draft state must not prevent social crawlers from
        // fetching the image selected by the photographer.
        if (!gallery || gallery.status === "archived") {
          return new Response("Not found", { status: 404 });
        }

        if (gallery.cover_url) {
          const res = await serve([gallery.cover_url]);
          if (res) return res;
        }

        if (gallery.og_image_id) {
          const { data: image } = await supabaseAdmin
            .from("crm_gallery_images")
            .select("preview_path,thumb_path,drive_file_id")
            .eq("id", gallery.og_image_id)
            .maybeSingle();
          // Thumb first: it is always card-sized, previews can be multi-megabyte.
          const res = await serve([image?.thumb_path, image?.preview_path]);
          if (res) return res;
          if (image?.drive_file_id) {
            const { fetchDriveThumbnail } = await import("@/lib/google-drive.server");
            const drive = await fetchDriveThumbnail(image.drive_file_id);
            if (drive) {
              return new Response(drive.body, {
                headers: headers(drive.headers.get("content-type") ?? "image/jpeg"),
              });
            }
          }
        }

        const { data: firstImage } = await supabaseAdmin
          .from("crm_gallery_images")
          .select("preview_path,thumb_path,drive_file_id")
          .eq("gallery_id", gallery.id)
          .order("sort_order", { ascending: true })
          .limit(1)
          .maybeSingle();
        const res = await serve([firstImage?.thumb_path, firstImage?.preview_path]);
        if (res) return res;
        if (firstImage?.drive_file_id) {
          const { fetchDriveThumbnail } = await import("@/lib/google-drive.server");
          const drive = await fetchDriveThumbnail(firstImage.drive_file_id);
          if (drive) {
            return new Response(drive.body, {
              headers: headers(drive.headers.get("content-type") ?? "image/jpeg"),
            });
          }
        }

        return new Response("Not found", { status: 404 });
      },
    },
  },
});
