import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { subdomainSectionUrl } from "@/lib/subdomains";
import { crmList, crmOverview } from "@/lib/crm.functions";
import { ContractsPanel } from "@/components/crm/ContractsPanel";
import { GalleriesPanel } from "@/components/crm/GalleriesPanel";
import { CrmSettingsPanel } from "@/components/crm/CrmSettingsPanel";
import { InvoicesPanel } from "@/components/crm/InvoicesPanel";
import { ActivityDock } from "@/components/crm/ActivityDock";

import { RecordPanel, type RecordField } from "@/components/crm/RecordPanel";
import { Btn, Card, Empty, Stat } from "@/components/crm/ui";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({
    meta: [
      { title: "Studio CRM | Shutter Ram" },
      { name: "description", content: "Private CRM for bookings, contracts and client galleries." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Studio CRM | Shutter Ram" },
      { property: "og:description", content: "Private CRM for the Shutter Ram photography studio." },
    ],
  }),
  component: CrmPage,
});

const PANELS = [
  { id: "dashboard", label: "Dashboard", hint: "A quick pulse of the studio." },
  { id: "clients", label: "Clients", hint: "People and enquiries in your pipeline." },
  { id: "work", label: "Work", hint: "Shoots and tasks." },
  { id: "galleries", label: "Galleries", hint: "Client selection and delivery galleries." },
  { id: "money", label: "Money", hint: "Invoices, payments and expenses." },
  { id: "documents", label: "Documents", hint: "Contracts and signatures." },
  { id: "setup", label: "Setup", hint: "Drive connection and CRM preferences." },
] as const;

const TABS = [
  { id: "overview", panel: "dashboard", label: "Overview" },
  { id: "contacts", panel: "clients", label: "Contacts" },
  { id: "leads", panel: "clients", label: "Pipeline" },
  { id: "bookings", panel: "work", label: "Bookings" },
  { id: "tasks", panel: "work", label: "Tasks" },
  { id: "galleries", panel: "galleries", label: "Galleries" },
  { id: "invoices", panel: "money", label: "Invoices" },
  { id: "bills", panel: "money", label: "Bills" },
  { id: "expenses", panel: "money", label: "Expenses" },
  { id: "contracts", panel: "documents", label: "Contracts" },
  { id: "settings", panel: "setup", label: "Settings" },
] as const;


const CONTACT_FIELDS: RecordField[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "city", label: "City" },
  { key: "source", label: "Source" },
  { key: "tags", label: "Tags", type: "tags" },
  { key: "notes", label: "Notes", type: "textarea" },
];

const LEAD_FIELDS: RecordField[] = [
  { key: "title", label: "Enquiry" },
  { key: "contact_id", label: "Contact", type: "contact" },
  {
    key: "stage",
    label: "Stage",
    type: "select",
    options: ["new", "contacted", "proposal", "booked", "shooting", "editing", "delivered", "lost"].map(
      (s) => ({ value: s, label: s[0]!.toUpperCase() + s.slice(1) }),
    ),
  },
  { key: "value", label: "Value", type: "number" },
  { key: "source", label: "Source" },
  { key: "event_date", label: "Event date", type: "date" },
  { key: "notes", label: "Notes", type: "textarea" },
];

const BOOKING_FIELDS: RecordField[] = [
  { key: "title", label: "Booking" },
  { key: "contact_id", label: "Client", type: "contact" },
  { key: "starts_at", label: "Starts", type: "datetime" },
  { key: "ends_at", label: "Ends", type: "datetime" },
  { key: "location", label: "Location" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["pencilled", "confirmed", "completed", "cancelled"].map((s) => ({
      value: s,
      label: s[0]!.toUpperCase() + s.slice(1),
    })),
  },
  { key: "package_name", label: "Package" },
  { key: "fee", label: "Fee", type: "number" },
  { key: "deposit", label: "Deposit", type: "number" },
  { key: "notes", label: "Notes", type: "textarea" },
];


const EXPENSE_FIELDS: RecordField[] = [
  { key: "title", label: "Expense" },
  { key: "category", label: "Category" },
  { key: "amount", label: "Amount", type: "number" },
  { key: "spent_on", label: "Date", type: "date" },
  { key: "notes", label: "Notes", type: "textarea" },
];

const TASK_FIELDS: RecordField[] = [
  { key: "title", label: "Task" },
  { key: "contact_id", label: "Related client", type: "contact" },
  { key: "due_at", label: "Due", type: "datetime" },
  {
    key: "priority",
    label: "Priority",
    type: "select",
    options: [
      { value: "low", label: "Low" },
      { value: "normal", label: "Normal" },
      { value: "high", label: "High" },
    ],
  },
  { key: "done", label: "Completed", type: "bool" },
  { key: "notes", label: "Notes", type: "textarea" },
];

function CrmPage() {
  const navigate = useNavigate();
  const overviewFn = useServerFn(crmOverview);
  const listFn = useServerFn(crmList);

  const [panel, setPanel] = useState<string>("dashboard");
  const [tab, setTab] = useState<string>("overview");
  const [contacts, setContacts] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof crmOverview>> | null>(null);
  const [denied, setDenied] = useState(false);

  async function loadContacts() {
    try {
      const rows = await listFn({
        data: { table: "crm_contacts", orderBy: "name", ascending: true },
      });
      setContacts(
        rows.map((r) => ({
          id: String(r["id"]),
          name: String(r["name"] ?? ""),
          email: String(r["email"] ?? ""),
        })),
      );
    } catch {
      /* handled by overview error */
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        setOverview(await overviewFn({ data: {} as never }));
        await loadContacts();
      } catch (error) {
        setDenied(true);
        toast.error(error instanceof Error ? error.message : "CRM unavailable");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    const stored = window.localStorage.getItem("crm:place") ?? "";
    const source = hash || stored;
    const [maybePanel, maybeTab] = source.includes("/") ? source.split("/") : [null, source];
    const found = TABS.find((t) => t.id === (maybeTab ?? ""));
    if (found) {
      setTab(found.id);
      setPanel(maybePanel && PANELS.some((p) => p.id === maybePanel) ? maybePanel : found.panel);
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !restored) return;
    window.history.replaceState(null, "", `${window.location.pathname}#${panel}/${tab}`);
    window.localStorage.setItem("crm:place", `${panel}/${tab}`);
  }, [panel, tab, restored]);



  if (denied) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-32">
        <Empty>
          Your account doesn't have CRM access. Ask an administrator to grant you studio access.
        </Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-28 pt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Studio CRM</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight">
            Run your business
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={subdomainSectionUrl(window.location.hostname, "admin")}
            className="border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground"
          >
            Content studio
          </a>
          <Link
            to="/"
            className="border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground"
          >
            View site
          </Link>
          <button
            type="button"
            onClick={() => {
              void supabase.auth.signOut().then(() => navigate({ to: "/auth", replace: true }));
            }}
            className="border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[15rem_1fr]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <p className="eyebrow mb-4">Panels</p>
          <div className="flex flex-wrap gap-2 lg:flex-col">
            {PANELS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPanel(p.id);
                  const first = TABS.find((t) => t.panel === p.id);
                  if (first) setTab(first.id);
                }}
                className={
                  "border px-4 py-3 text-left text-[0.6875rem] tracking-[0.18em] uppercase transition-colors " +
                  (panel === p.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-hairline text-muted-foreground hover:border-foreground hover:text-foreground")
                }
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-5 hidden text-xs leading-relaxed text-muted-foreground lg:block">
            {PANELS.find((p) => p.id === panel)?.hint}
          </p>
        </aside>

        <div className="min-w-0">
          <nav className="flex flex-wrap gap-x-6 gap-y-3 border-b border-hairline pb-4">
            {TABS.filter((t) => t.panel === panel).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={
                  "text-[0.6875rem] tracking-[0.24em] uppercase transition-colors " +
                  (tab === t.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {t.label}
              </button>
            ))}
          </nav>

      <div className="mt-12">
        {tab === "overview" ? (
          overview === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Contacts" value={overview.contacts} />
                <Stat label="Pipeline" value={Math.round(overview.pipelineValue).toLocaleString()} />
                <Stat label="Upcoming shoots" value={overview.upcoming} />
                <Stat label="Open tasks" value={overview.openTasks} />
                <Stat label="Invoiced" value={Math.round(overview.invoiced).toLocaleString()} />
                <Stat
                  label="Outstanding"
                  value={Math.round(overview.outstanding).toLocaleString()}
                />
                <Stat label="Contracts signed" value={overview.contractsSigned} />
                <Stat label="Awaiting signature" value={overview.contractsPending} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <p className="text-[0.625rem] tracking-[0.24em] uppercase text-muted-foreground">
                    Next bookings
                  </p>
                  <ul className="mt-4 space-y-3 text-sm">
                    {(overview.bookings as { id: string; title: string; starts_at: string | null }[])
                      .length === 0 ? (
                      <li className="text-muted-foreground">Nothing booked yet.</li>
                    ) : (
                      (
                        overview.bookings as {
                          id: string;
                          title: string;
                          starts_at: string | null;
                        }[]
                      ).map((b) => (
                        <li key={b.id} className="flex justify-between gap-4">
                          <span className="truncate">{b.title}</span>
                          <span className="shrink-0 text-muted-foreground">
                            {b.starts_at ? new Date(b.starts_at).toLocaleDateString() : "—"}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </Card>
                <Card>
                  <p className="text-[0.625rem] tracking-[0.24em] uppercase text-muted-foreground">
                    Recent activity
                  </p>
                  <ul className="mt-4 space-y-3 text-sm">
                    {(overview.activity as { id: string; message: string; created_at: string }[])
                      .length === 0 ? (
                      <li className="text-muted-foreground">No activity yet.</li>
                    ) : (
                      (
                        overview.activity as { id: string; message: string; created_at: string }[]
                      ).map((a) => (
                        <li key={a.id} className="flex justify-between gap-4">
                          <span className="truncate">{a.message}</span>
                          <span className="shrink-0 text-muted-foreground">
                            {new Date(a.created_at).toLocaleDateString()}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </Card>
              </div>
            </div>
          )
        ) : null}

        {tab === "contacts" ? (
          <RecordPanel
            table="crm_contacts"
            title="Contacts"
            itemLabel="contact"
            titleKey="name"
            subtitleKeys={["email", "phone", "city"]}
            fields={CONTACT_FIELDS}
            onChanged={loadContacts}
          />
        ) : null}
        {tab === "leads" ? (
          <RecordPanel
            table="crm_leads"
            title="Pipeline"
            itemLabel="enquiry"
            titleKey="title"
            subtitleKeys={["stage", "contact_id", "value"]}
            fields={LEAD_FIELDS}
            contacts={contacts}
            defaults={{ stage: "new" }}
          />
        ) : null}
        {tab === "bookings" ? (
          <RecordPanel
            table="crm_bookings"
            title="Bookings"
            itemLabel="booking"
            titleKey="title"
            subtitleKeys={["starts_at", "location", "status"]}
            orderBy="starts_at"
            ascending
            fields={BOOKING_FIELDS}
            contacts={contacts}
            defaults={{ status: "pencilled" }}
          />
        ) : null}
        {tab === "invoices" ? <InvoicesPanel contacts={contacts} /> : null}
        {tab === "bills" ? <InvoicesPanel contacts={contacts} mode="bills" /> : null}

        {tab === "expenses" ? (
          <RecordPanel
            table="crm_expenses"
            title="Expenses"
            itemLabel="expense"
            titleKey="title"
            subtitleKeys={["category", "amount", "spent_on"]}
            fields={EXPENSE_FIELDS}
          />
        ) : null}
        {tab === "tasks" ? (
          <RecordPanel
            table="crm_tasks"
            title="Tasks"
            itemLabel="task"
            titleKey="title"
            subtitleKeys={["due_at", "priority"]}
            fields={TASK_FIELDS}
            contacts={contacts}
            defaults={{ priority: "normal", done: false }}
          />
        ) : null}
        {tab === "contracts" ? <ContractsPanel contacts={contacts} /> : null}
        {tab === "galleries" ? <GalleriesPanel contacts={contacts} /> : null}
        {tab === "settings" ? <CrmSettingsPanel /> : null}
          </div>
        </div>
      </div>
      <ActivityDock />
    </div>
  );
}
