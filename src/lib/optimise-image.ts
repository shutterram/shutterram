/**
 * Browser-side image optimisation for studio uploads.
 *
 * Any photo dropped into the content studio is decoded, downscaled to a
 * sensible maximum edge and re-encoded as WebP (AVIF is skipped — browser
 * encode support is still patchy) before it ever reaches storage. Vector and
 * animated files pass through untouched.
 */

const MAX_EDGE = 2400; // plenty for full-bleed hero photos on a 2x display
const QUALITY = 0.82;
const PASS_THROUGH = ["image/svg+xml", "image/gif"];

export interface OptimisedImage {
  file: File;
  /** True when the file was re-encoded (used for the toast wording). */
  changed: boolean;
  originalSize: number;
}

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image"));
    };
    img.src = url;
  });
}

/** Resize + convert an image to a web-optimised WebP. Never throws. */
export async function optimiseImage(file: File): Promise<OptimisedImage> {
  const original = { file, changed: false, originalSize: file.size };
  if (typeof document === "undefined") return original;
  if (!file.type.startsWith("image/") || PASS_THROUGH.includes(file.type)) return original;

  try {
    const bitmap = await loadBitmap(file);
    const width = "width" in bitmap ? bitmap.width : 0;
    const height = "height" in bitmap ? bitmap.height : 0;
    if (!width || !height) return original;

    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height);
    if ("close" in bitmap) bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALITY),
    );
    if (!blob || blob.type !== "image/webp") return original;
    // Keep the original when the conversion somehow made things heavier.
    if (blob.size >= file.size && scale === 1) return original;

    const name = file.name.replace(/\.[^.]+$/, "") || "image";
    return {
      file: new File([blob], `${name}.webp`, { type: "image/webp" }),
      changed: true,
      originalSize: file.size,
    };
  } catch {
    // Formats the browser can't decode (e.g. HEIC) upload as-is.
    return original;
  }
}

export const kb = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
