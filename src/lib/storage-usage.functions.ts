import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StorageUsageReport, BrowseResult } from "./storage-usage.server";

export type { StorageUsageReport, BrowseResult, BrowseEntry } from "./storage-usage.server";

/** Full storage breakdown across every bucket the site uses. */
export const getStorageUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StorageUsageReport> => {
    const { assertAdmin } = await import("./templates.server");
    await assertAdmin(context);
    const { buildStorageUsage } = await import("./storage-usage.server");
    return buildStorageUsage();
  });

/** Every file inside one storage area, so it can be reviewed and cleared. */
export const browseStorage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bucket: string }) => ({ bucket: String(input?.bucket ?? "") }))
  .handler(async ({ data, context }): Promise<BrowseResult> => {
    const { assertAdmin } = await import("./templates.server");
    await assertAdmin(context);
    const { browseBucketFiles } = await import("./storage-usage.server");
    return browseBucketFiles(data.bucket);
  });

/** Permanently delete chosen files from one storage area. */
export const deleteStorageFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bucket: string; paths: string[] }) => ({
    bucket: String(input?.bucket ?? ""),
    paths: (input?.paths ?? []).map((p) => String(p)).filter(Boolean).slice(0, 1000),
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./templates.server");
    await assertAdmin(context);
    const { deleteBucketFiles } = await import("./storage-usage.server");
    return { removed: await deleteBucketFiles(data.bucket, data.paths) };
  });
