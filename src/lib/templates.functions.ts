import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertAdmin,
  listChanges,
  listVersions,
  restore,
  saveVersion,
  snapshot,
  tablesForScope,
  versionData,
  type ChangeEntry,
  type SiteVersion,
  type TemplateFile,
  type Json,
} from "./templates.server";

/** Download the current content of one scope as a template file. */
export const exportTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scope: string }) => ({ scope: String(input.scope) }))
  .handler(async ({ data, context }): Promise<TemplateFile> => {
    await assertAdmin(context);
    const tables = tablesForScope(data.scope);
    const rows = await snapshot(tables);
    return {
      format: "shutterram-template",
      version: 1,
      scope: data.scope,
      exportedAt: new Date().toISOString(),
      tables,
      data: rows,
    };
  });

/** Load a template file back into the site, keeping a snapshot to roll back to. */
export const importTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scope: string; data: Record<string, Json[]> }) => ({
    scope: String(input.scope),
    data: input.data,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const tables = tablesForScope(data.scope);
    const before = await snapshot(tables);
    await saveVersion({
      label: "Before loading a template",
      kind: "pre-restore",
      scope: data.scope,
      tables,
      data: before,
      userId: context.userId,
    });
    await restore(data.data, tables);
    await saveVersion({
      label: "Template loaded",
      kind: "import",
      scope: data.scope,
      tables,
      data: await snapshot(tables),
      userId: context.userId,
    });
    return { ok: true, tables };
  });

/** Save the current site as a named version. */
export const createVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { label: string; scope: string }) => ({
    label: String(input.label ?? "").slice(0, 120) || "Manual snapshot",
    scope: String(input.scope ?? "all"),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const tables = tablesForScope(data.scope);
    await saveVersion({
      label: data.label,
      kind: "manual",
      scope: data.scope,
      tables,
      data: await snapshot(tables),
      userId: context.userId,
    });
    return { ok: true };
  });

export const getVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SiteVersion[]> => {
    await assertAdmin(context);
    return listVersions();
  });

export const getChanges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } | undefined) => ({
    limit: Math.min(Math.max(Number(input?.limit ?? 100), 1), 300),
  }))
  .handler(async ({ data, context }): Promise<ChangeEntry[]> => {
    await assertAdmin(context);
    return listChanges(data.limit);
  });

/** Roll the site back (or forward) to a saved version. */
export const restoreVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const version = await versionData(data.id);
    const tables = version.tables?.length ? version.tables : Object.keys(version.data ?? {});
    await saveVersion({
      label: "Before rolling back",
      kind: "pre-restore",
      scope: version.scope,
      tables,
      data: await snapshot(tables),
      userId: context.userId,
    });
    await restore(version.data, tables);
    await saveVersion({
      label: `Rolled to “${version.label}”`,
      kind: "restore",
      scope: version.scope,
      tables,
      data: await snapshot(tables),
      userId: context.userId,
    });
    return { ok: true };
  });

/** Download a saved version as a template file. */
export const downloadVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data, context }): Promise<TemplateFile> => {
    await assertAdmin(context);
    const version = await versionData(data.id);
    return {
      format: "shutterram-template",
      version: 1,
      scope: version.scope,
      exportedAt: version.created_at,
      tables: version.tables ?? Object.keys(version.data ?? {}),
      data: version.data,
    };
  });

export const deleteVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_versions" as never)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
