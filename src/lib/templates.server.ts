import { scopeById } from "./template-scopes";

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface SiteVersion {
  id: string;
  label: string;
  kind: string;
  scope: string;
  tables: string[];
  createdAt: string;
}

export interface ChangeEntry {
  id: string;
  table: string;
  op: string;
  rowId: string | null;
  title: string;
  createdAt: string;
}

export interface TemplateFile {
  format: "shutterram-template";
  version: 1;
  scope: string;
  exportedAt: string;
  tables: string[];
  data: Record<string, Json[]>;
}

type Ctx = { supabase: unknown; userId: string };

/** Throws unless the caller is a signed-in admin. */
export async function assertAdmin(context: Ctx) {
  const supabase = context.supabase as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  };
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export function tablesForScope(scope: string): string[] {
  const found = scopeById(scope);
  if (!found) throw new Error("Unknown template scope");
  return found.tables;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Read every row of the tables covered by a scope. */
export async function snapshot(tables: string[]): Promise<Record<string, Json[]>> {
  const db = await admin();
  const { data, error } = await db.rpc("content_snapshot" as never, { _tables: tables } as never);
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, Json[]>;
}

/** Save a snapshot into the version history. */
export async function saveVersion(opts: {
  label: string;
  kind: string;
  scope: string;
  tables: string[];
  data: Record<string, Json[]>;
  userId: string;
}) {
  const db = await admin();
  const { error } = await db.from("site_versions" as never).insert({
    label: opts.label,
    kind: opts.kind,
    scope: opts.scope,
    tables: opts.tables,
    data: opts.data,
    created_by: opts.userId,
  } as never);
  if (error) throw new Error(error.message);
}

/** Replace the rows of the given tables with the ones in `data`. */
export async function restore(data: Record<string, Json[]>, tables: string[]) {
  const db = await admin();
  const filtered: Record<string, Json[]> = {};
  for (const t of tables) if (Array.isArray(data[t])) filtered[t] = data[t]!;
  if (!Object.keys(filtered).length) throw new Error("This template has no data for that scope.");
  const { error } = await db.rpc("restore_snapshot" as never, {
    _data: filtered,
    _tables: Object.keys(filtered),
  } as never);
  if (error) throw new Error(error.message);
}

export async function listVersions(): Promise<SiteVersion[]> {
  const db = await admin();
  const { data, error } = await db
    .from("site_versions" as never)
    .select("id,label,kind,scope,tables,created_at")
    .order("created_at", { ascending: false })
    .limit(120);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    id: String(r["id"]),
    label: String(r["label"] ?? "Snapshot"),
    kind: String(r["kind"] ?? "auto"),
    scope: String(r["scope"] ?? "all"),
    tables: (r["tables"] as string[]) ?? [],
    createdAt: String(r["created_at"]),
  }));
}

export async function versionData(id: string) {
  const db = await admin();
  const { data, error } = await db
    .from("site_versions" as never)
    .select("id,label,scope,tables,data,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("That version no longer exists.");
  return data as unknown as {
    id: string;
    label: string;
    scope: string;
    tables: string[];
    data: Record<string, Json[]>;
    created_at: string;
  };
}

const TITLE_KEYS = ["label", "title", "name", "caption", "key", "path", "slug"];

export async function listChanges(limit: number): Promise<ChangeEntry[]> {
  const db = await admin();
  const { data, error } = await db
    .from("content_changes" as never)
    .select("id,table_name,row_id,op,before,after,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => {
    const row = (r["after"] ?? r["before"] ?? {}) as Record<string, unknown>;
    const key = TITLE_KEYS.find((k) => typeof row[k] === "string" && row[k]);
    return {
      id: String(r["id"]),
      table: String(r["table_name"]),
      op: String(r["op"]),
      rowId: r["row_id"] ? String(r["row_id"]) : null,
      title: key ? String(row[key]).slice(0, 80) : "",
      createdAt: String(r["created_at"]),
    };
  });
}
