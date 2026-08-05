import { createServerFn } from "@tanstack/react-start";
import { reviewSchema, decodeImage, extensionFor } from "./submit-review.server";

/**
 * Public endpoint used by the private client review link. Stores the review as
 * a pending testimonial (invisible to visitors until it is approved in the
 * studio) and uploads any client photographs to the site image bucket.
 */
export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => reviewSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const paths: string[] = [];
    for (const file of data.images.slice(0, 6)) {
      const decoded = decodeImage(file.dataUrl);
      if (!decoded) continue;
      const key = `reviews/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensionFor(decoded.type)}`;
      const { error } = await supabaseAdmin.storage
        .from("site-images")
        .upload(key, decoded.bytes, { contentType: decoded.type, cacheControl: "31536000" });
      if (error) {
        console.error(`[review] upload failed: ${error.message}`);
        continue;
      }
      paths.push(`/api/public/img/${key}`);
    }

    const { error } = await supabaseAdmin.from("testimonials").insert({
      quote: data.review,
      name: data.name,
      role: data.occasion,
      occasion: data.occasion,
      email: data.email,
      rating: data.rating,
      images: paths,
      status: "pending",
      sort_order: 0,
    });

    if (error) {
      console.error(`[review] insert failed: ${error.message}`);
      return { ok: false, error: "Could not save your review. Please try again." };
    }

    return { ok: true };
  });
