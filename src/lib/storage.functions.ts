import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./templates.server";
import { listBucketFiles, referencedKeys, removeFiles, type StoredFile } from "./storage.server";

export interface OrphanReport {
  orphans: StoredFile[];
  totalFiles: number;
  usedFiles: number;
}

/** Files in the bucket that nothing on the site (or in history) points at any more. */
export const findOrphanFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { keepHistory?: boolean } | undefined) => ({
    keepHistory: input?.keepHistory !== false,
  }))
  .handler(async ({ data, context }): Promise<OrphanReport> => {
    await assertAdmin(context);
    const [files, used] = await Promise.all([
      listBucketFiles(),
      referencedKeys(data.keepHistory),
    ]);
    const orphans = files.filter((f) => !used.has(f.key));
    return { orphans, totalFiles: files.length, usedFiles: files.length - orphans.length };
  });

/** Permanently delete image files from storage. */
export const deleteImageFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { keys: string[] }) => ({
    keys: (input.keys ?? []).map((k) => String(k)).filter(Boolean).slice(0, 500),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const removed = await removeFiles(data.keys);
    return { removed };
  });
