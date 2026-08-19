import { createFileRoute } from "@tanstack/react-router";

/** Serves gallery thumbnails and previews to clients holding a valid signed link. */
export const Route = createFileRoute("/api/public/crm/img/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const imageId = (params as { _splat?: string })._splat?.split("/")[0] ?? "";
        const url = new URL(request.url);
        const kind = url.searchParams.get("k") ?? "thumb";
        const exp = url.searchParams.get("e") ?? "";
        const sig = url.searchParams.get("s") ?? "";
        if (!imageId) return new Response("Not found", { status: 404 });

        const { verifyImageSig, GALLERY_BUCKET } = await import("@/lib/gallery.server");
        if (!(await verifyImageSig(imageId, kind, exp, sig))) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: image } = await supabaseAdmin
          .from("crm_gallery_images")
          .select("preview_path,thumb_path,drive_file_id")
          .eq("id", imageId)
          .maybeSingle();
        if (!image) return new Response("Not found", { status: 404 });

        const path = kind === "preview" ? image.preview_path : image.thumb_path;
        if (path) {
          const file = await supabaseAdmin.storage.from(GALLERY_BUCKET).download(path);
          if (file.error || !file.data) return new Response("Not found", { status: 404 });
          return new Response(await file.data.arrayBuffer(), {
            headers: {
              "Content-Type": "image/webp",
              "Cache-Control": "private, max-age=3600",
            },
          });
        }

        if (image.drive_file_id) {
          const { fetchDriveFile } = await import("@/lib/google-drive.server");
          const res = await fetchDriveFile(image.drive_file_id);
          if (!res.ok) return new Response("Not found", { status: 404 });
          return new Response(res.body, {
            headers: {
              "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
              "Cache-Control": "private, max-age=3600",
            },
          });
        }

        return new Response("Not found", { status: 404 });
      },
    },
  },
});
