import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CrmValue = string | number | boolean | null | CrmValue[] | { [key: string]: CrmValue };
export type CrmRow = Record<string, CrmValue>;

/** Generic admin-only list for any CRM table. */
export const crmList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      table: string;
      orderBy?: string;
      ascending?: boolean;
      limit?: number;
      match?: Record<string, string>;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<CrmRow[]> => {
    const { assertCrmAdmin, assertCrmTable } = await import("./crm.server");
    await assertCrmAdmin(context);
    const table = assertCrmTable(data.table);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin.from(table).select("*");
    for (const [k, v] of Object.entries(data.match ?? {})) query = query.eq(k, v);
    query = query.order(data.orderBy ?? "created_at", { ascending: data.ascending ?? false });
    const { data: rows, error } = await query.limit(Math.min(data.limit ?? 500, 2000));
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as CrmRow[];
  });

export const crmSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { table: string; row: CrmRow }) => input)
  .handler(async ({ data, context }): Promise<CrmRow> => {
    const { assertCrmAdmin, assertCrmTable, logActivity } = await import("./crm.server");
    const userId = await assertCrmAdmin(context);
    const table = assertCrmTable(data.table);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = { ...data.row };
    const isNew = !row["id"];
    if (isNew) delete row["id"];
    const { data: saved, error } = await supabaseAdmin
      .from(table)
      .upsert(row as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logActivity({
      entityType: table.replace("crm_", ""),
      entityId: (saved as { id?: string })?.id ?? null,
      kind: isNew ? "created" : "updated",
      message: `${isNew ? "Added" : "Updated"} ${table.replace("crm_", "").replace(/s$/, "")}`,
      userId,
    });
    return saved as unknown as CrmRow;
  });

export const crmDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { table: string; id: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin, assertCrmTable, logActivity } = await import("./crm.server");
    const userId = await assertCrmAdmin(context);
    const table = assertCrmTable(data.table);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from(table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity({
      entityType: table.replace("crm_", ""),
      entityId: data.id,
      kind: "deleted",
      message: `Deleted a ${table.replace("crm_", "").replace(/s$/, "")}`,
      userId,
    });
    return { ok: true };
  });

export const crmSettingsGet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CrmRow | null> => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("crm_settings").select("*").eq("id", true).maybeSingle();
    return (data ?? null) as unknown as CrmRow | null;
  });

export const crmSettingsSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { patch: CrmRow }) => input)
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("crm_settings")
      .update(data.patch as never)
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Numbers for the CRM dashboard. */
export const crmOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [contacts, leads, bookings, invoices, tasks, contracts, galleries, activity] =
      await Promise.all([
        supabaseAdmin.from("crm_contacts").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("crm_leads").select("id,stage,value"),
        supabaseAdmin.from("crm_bookings").select("id,title,starts_at,status").order("starts_at"),
        supabaseAdmin.from("crm_invoices").select("id,amount,status,due_on"),
        supabaseAdmin.from("crm_tasks").select("id,title,due_at,done,priority").eq("done", false),
        supabaseAdmin.from("crm_contracts").select("id,status"),
        supabaseAdmin.from("crm_galleries").select("id,kind,status"),
        supabaseAdmin
          .from("crm_activity")
          .select("id,kind,message,created_at")
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

    const leadRows = (leads.data ?? []) as { stage: string; value: number }[];
    const invoiceRows = (invoices.data ?? []) as { amount: number; status: string }[];
    const now = Date.now();

    return {
      contacts: contacts.count ?? 0,
      leads: leadRows.length,
      pipelineValue: leadRows
        .filter((l) => !["lost", "delivered"].includes(l.stage))
        .reduce((sum, l) => sum + Number(l.value ?? 0), 0),
      upcoming: ((bookings.data ?? []) as { starts_at: string | null }[]).filter(
        (b) => b.starts_at && new Date(b.starts_at).getTime() > now,
      ).length,
      bookings: (bookings.data ?? []).slice(0, 6),
      invoiced: invoiceRows.reduce((s, i) => s + Number(i.amount ?? 0), 0),
      outstanding: invoiceRows
        .filter((i) => i.status !== "paid")
        .reduce((s, i) => s + Number(i.amount ?? 0), 0),
      openTasks: (tasks.data ?? []).length,
      tasks: (tasks.data ?? []).slice(0, 6),
      contractsSigned: ((contracts.data ?? []) as { status: string }[]).filter(
        (c) => c.status === "signed",
      ).length,
      contractsPending: ((contracts.data ?? []) as { status: string }[]).filter((c) =>
        ["sent", "opened"].includes(c.status),
      ).length,
      galleries: (galleries.data ?? []).length,
      activity: activity.data ?? [],
    };
  });
