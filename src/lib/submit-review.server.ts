import { z } from "zod";

/** Shape accepted by the public review submission endpoint. */
export const reviewSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  occasion: z.string().trim().min(2).max(150),
  rating: z.number().int().min(1).max(5),
  review: z.string().trim().min(20).max(2000),
  images: z
    .array(
      z.object({
        name: z.string().max(200),
        type: z.string().max(100),
        dataUrl: z.string().max(9_000_000),
      }),
    )
    .max(6)
    .default([]),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

/** Decodes a data URL into raw bytes, rejecting anything that is not an image. */
export function decodeImage(dataUrl: string): { bytes: Uint8Array; type: string } | null {
  const match = /^data:([a-z0-9/+.-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const type = match[1]!.toLowerCase();
  if (!ALLOWED.includes(type)) return null;
  try {
    const binary = atob(match[2]!);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    if (bytes.length > 6_000_000) return null;
    return { bytes, type };
  } catch {
    return null;
  }
}

export function extensionFor(type: string): string {
  return type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
}
