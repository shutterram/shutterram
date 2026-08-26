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
          .select(
            "gallery_id,original_path,preview_path,thumb_path,drive_file_id,name,original_name",
          )
          .eq("id", imageId)
          .maybeSingle();
        if (!image) return new Response("Not found", { status: 404 });

        const { data: gallery } = await supabaseAdmin
          .from("crm_galleries")
          .select("downscale_previews")
          .eq("id", image.gallery_id)
          .maybeSingle();
        const serveOriginal =
          kind === "orig" || (kind === "preview" && gallery?.downscale_previews === false);

        const fileName = (image.original_name || image.name || "photo.jpg") as string;
        const safeFileName = fileName.replace(/["\\/]/g, "");
        const stem = safeFileName.replace(/\.[^.]+$/, "") || "photo";
        const disposition = url.searchParams.get("d") === "1";

        // Originals stream straight from Drive when the gallery is Drive-linked,
        // so full-size bytes never sit in our own storage.
        if (serveOriginal && image.drive_file_id) {
          const { fetchDriveFile } = await import("@/lib/google-drive.server");
          const res = await fetchDriveFile(image.drive_file_id);
          if (!res.ok) return new Response("Not found", { status: 404 });
          return new Response(res.body, {
            headers: {
              "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
              "Cache-Control": "public, max-age=21600, s-maxage=21600",
              ...(disposition
                ? { "Content-Disposition": `attachment; filename="${safeFileName}"` }
                : {}),
            },
          });
        }

        if (serveOriginal && image.original_path) {
          const file = await supabaseAdmin.storage
            .from(GALLERY_BUCKET)
            .download(image.original_path);
          if (file.error || !file.data) return new Response("Not found", { status: 404 });
          return new Response(await file.data.arrayBuffer(), {
            headers: {
              "Content-Type": file.data.type || "application/octet-stream",
              "Cache-Control": "public, max-age=21600, s-maxage=21600",
              ...(disposition
                ? { "Content-Disposition": `attachment; filename="${safeFileName}"` }
                : {}),
            },
          });
        }

        // Never fall back to a multi-megabyte Drive original for an opened
        // preview. Until a preview has been generated, serve the small grid
        // thumbnail instead; downloads still use the explicit `orig` branch.
        const path =
          kind === "preview"
            ? image.preview_path || image.thumb_path
            : kind === "orig"
              ? image.preview_path || image.thumb_path
              : image.thumb_path;
        if (path) {
          const file = await supabaseAdmin.storage.from(GALLERY_BUCKET).download(path);
          if (!file.error && file.data) {
            const generatedJpeg = path.toLowerCase().endsWith(".jpg");
            const previewName = `${stem}-${kind === "thumb" ? "thumbnail" : "preview"}.jpg`;
            return new Response(await file.data.arrayBuffer(), {
              headers: {
                "Content-Type": generatedJpeg
                  ? "image/jpeg"
                  : file.data.type || "application/octet-stream",
                "Cache-Control": "public, max-age=21600, s-maxage=21600",
                "Content-Disposition": disposition
                  ? `attachment; filename="${kind === "orig" ? safeFileName : previewName}"`
                  : `inline; filename="${previewName}"`,
              },
            });
          }
          // A storage-cleanup deletion can leave the old path on the image row.
          // For grid thumbnails only, recover with Google's small derivative;
          // never pull a multi-megabyte original into the grid.
          if ((kind === "thumb" || kind === "preview") && image.drive_file_id) {
            const { fetchDriveThumbnail } = await import("@/lib/google-drive.server");
            const fallback = await fetchDriveThumbnail(image.drive_file_id);
            if (fallback) {
              return new Response(fallback.body, {
                headers: {
                  "Content-Type": fallback.headers.get("content-type") ?? "image/jpeg",
                  "Cache-Control": "public, max-age=21600, s-maxage=21600",
                },
              });
            }
          }
        }

        if ((kind === "thumb" || kind === "preview") && image.drive_file_id) {
          const { fetchDriveThumbnail } = await import("@/lib/google-drive.server");
          const res = await fetchDriveThumbnail(image.drive_file_id);
          if (!res) return new Response("Not found", { status: 404 });
          return new Response(res.body, {
            headers: {
              "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
              "Cache-Control": "public, max-age=21600, s-maxage=21600",
            },
          });
        }

        if (kind === "orig" && image.drive_file_id) {
          const { fetchDriveFile } = await import("@/lib/google-drive.server");
          const res = await fetchDriveFile(image.drive_file_id);
          if (!res.ok) return new Response("Not found", { status: 404 });
          return new Response(res.body, {
            headers: {
              "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
              "Cache-Control": "public, max-age=21600, s-maxage=21600",
              ...(disposition
                ? { "Content-Disposition": `attachment; filename="${safeFileName}"` }
                : {}),
            },
          });
        }

        return new Response("Not found", { status: 404 });
      },
    },
  },
});
