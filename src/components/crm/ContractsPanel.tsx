import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  createContract,
  getContractDetail,
  listContracts,
  saveContractFields,
  updateContractSharing,
  type ContractSummary,
} from "@/lib/contracts.functions";
import type { ContractField } from "@/lib/contracts.server";
import { crmDelete, crmList } from "@/lib/crm.functions";
import { usePdfPages, countPdfPages } from "./PdfPages";
import { PdfViewer } from "./PdfViewer";
import { SignatureInput } from "./SignatureInput";
import { AreaField, Btn, Card, Empty, Label, SelectField, TextField, copyLink } from "./ui";
import { EmailButton } from "@/components/crm/EmailButton";
import { DEFAULT_TIMEZONE, TIMEZONE_OPTIONS, formatInZone, todayInZone } from "@/lib/timezones";
import { DEFAULT_FIELD_PT, fieldDisplay, fieldFontCss } from "@/lib/contract-fields";
import { SITE_URL } from "@/lib/seo";
import { contractShortLink } from "@/lib/financial-documents.functions";

const FIELD_KINDS = [
  { value: "signature", label: "Signature", hint: "Draw or type", w: 0.26, h: 0.07 },
  { value: "initials", label: "Initials", hint: "Short mark", w: 0.1, h: 0.05 },
  { value: "text", label: "Text", hint: "Any answer", w: 0.28, h: 0.04 },
  { value: "email", label: "Email", hint: "Email address", w: 0.28, h: 0.04 },
  { value: "phone", label: "Phone", hint: "Phone number", w: 0.22, h: 0.04 },
  { value: "date", label: "Date", hint: "Auto-filled on signing", w: 0.16, h: 0.04 },
  { value: "checkbox", label: "Checkbox", hint: "Tick to agree", w: 0.04, h: 0.03 },
  { value: "custom", label: "Custom", hint: "Your own label", w: 0.28, h: 0.04 },
];

function newField(
  page: number,
  kind: string,
  role: "client" | "me",
  tz: string,
  at?: { x: number; y: number },
): ContractField {
  const preset = FIELD_KINDS.find((k) => k.value === kind);
  const w = preset?.w ?? 0.28;
  const h = preset?.h ?? 0.05;
  return {
    id: crypto.randomUUID(),
    page,
    x: Math.min(0.99 - w, Math.max(0, (at?.x ?? 0.5) - w / 2)),
    y: Math.min(0.99 - h, Math.max(0, (at?.y ?? 0.45) - h / 2)),
    w: preset?.w ?? 0.28,
    h: preset?.h ?? 0.05,
    kind,
    label: preset?.label ?? "Field",
    placeholder: "",
    required: kind === "signature",
    // My own date fields default to today; the client's fill in on signing.
    value: kind === "date" && role === "me" ? todayInZone(tz) : "",
    sort_order: 0,
    role,
    font_size: 0,
    bold: false,
  };
}

function Accordion({
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  title: string;
  hint?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border border-hairline bg-background">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-[0.625rem] tracking-[0.22em] uppercase">{title}</span>
          {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
        </span>
        <span className="text-sm text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="border-t border-hairline px-4 py-4">{children}</div> : null}
    </div>
  );
}

export function ContractsPanel({
  contacts,
}: {
  contacts: { id: string; name: string; email?: string }[];
}) {
  const list = useServerFn(listContracts);
  const create = useServerFn(createContract);
  const remove = useServerFn(crmDelete);

  const [rows, setRows] = useState<ContractSummary[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useMemo(
    () => async () => {
      try {
        setRows(await list({ data: {} as never }));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load contracts");
        setRows([]);
      }
    },
    [list],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Signable contracts must be PDF files.");
      return;
    }
    setUploading(true);
    try {
      const pageCount = await countPdfPages(file);
      const buf = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buf.length; i += 8192) {
        binary += String.fromCharCode(...buf.subarray(i, i + 8192));
      }
      const res = await create({
        data: {
          title: file.name.replace(/\.pdf$/i, ""),
          pdfBase64: btoa(binary),
          pageCount,
        },
      });
      toast.success("Contract uploaded — place your fields next");
      await load();
      setOpenId(res.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (openId) {
    return (
      <ContractEditor
        id={openId}
        contacts={contacts}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  return (
    <ContractsTable
      rows={rows}
      contacts={contacts}
      uploading={uploading}
      fileRef={fileRef}
      onUpload={upload}
      onOpen={setOpenId}
      onDelete={(cid) => {
        if (!window.confirm("Delete this contract?")) return;
        void remove({ data: { table: "crm_contracts", id: cid } }).then(load);
      }}
    />
  );
}

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Live" },
  { value: "opened", label: "Opened" },
  { value: "signed", label: "Signed" },
  { value: "void", label: "Void" },
];

/** Searchable, filterable database view of every contract. */
function ContractsTable({
  rows,
  contacts,
  uploading,
  fileRef,
  onUpload,
  onOpen,
  onDelete,
}: {
  rows: ContractSummary[] | null;
  contacts: { id: string; name: string; email?: string }[];
  uploading: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (file: File) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const shortLink = useServerFn(contractShortLink);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "title" | "status">("newest");

  const nameOf = (id: string | null) => contacts.find((c) => c.id === id)?.name ?? "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (rows ?? []).filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!q) return true;
      return [c.title, c.signer_name, nameOf(c.contact_id), c.status].some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(q),
      );
    });
    const sorted = [...list];
    if (sort === "oldest") sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
    else if (sort === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "status") sorted.sort((a, b) => a.status.localeCompare(b.status));
    else sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, status, sort, contacts]);

  const counts = (rows ?? []).reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Contracts</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {(rows ?? []).length} total · {counts["signed"] ?? 0} signed ·{" "}
            {(counts["sent"] ?? 0) + (counts["opened"] ?? 0)} awaiting signature
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
            }}
          />
          <Btn variant="solid" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? "Uploading…" : "Upload PDF"}
          </Btn>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div className="min-w-[16rem] flex-1">
          <TextField label="Search" value={query} onChange={setQuery} />
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatus(s.value)}
              className={`border px-3 py-2 text-[0.625rem] tracking-[0.18em] uppercase transition-colors ${
                status === s.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-hairline text-muted-foreground hover:border-foreground/50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="w-40">
          <SelectField
            label="Sort"
            value={sort}
            onChange={(v) => setSort(v as typeof sort)}
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "title", label: "Title A–Z" },
              { value: "status", label: "Status" },
            ]}
          />
        </div>
      </div>

      {rows === null ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-8">
          <Empty>
            {(rows ?? []).length
              ? "No contracts match this search."
              : "Upload a PDF to create your first signable contract."}
          </Empty>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto border border-hairline">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-[0.625rem] tracking-[0.2em] uppercase text-muted-foreground">
                <th className="px-4 py-3 font-normal">Document</th>
                <th className="px-4 py-3 font-normal">Client</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">Signed</th>
                <th className="px-4 py-3 font-normal">Security</th>
                <th className="px-4 py-3 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-hairline/70 last:border-b-0 align-top">
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => onOpen(c.id)}
                      className="text-left hover:underline"
                    >
                      {c.title || "Untitled"}
                    </button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.page_count} page{c.page_count === 1 ? "" : "s"} ·{" "}
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    {nameOf(c.contact_id) || c.signer_name || "—"}
                  </td>
                  <td className="px-4 py-4">
                    <span className="border border-hairline px-2 py-1 text-[0.625rem] tracking-[0.18em] uppercase">
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    {c.signed_at
                      ? `${c.signer_name || "Client"} · ${new Date(c.signed_at).toLocaleDateString()}`
                      : "—"}
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    {[
                      c.has_password ? "Password" : "",
                      c.access_code ? "Code" : "",
                      c.expires_at ? "Expires" : "",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Open link"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Btn
                        onClick={() =>
                          void shortLink({ data: { id: c.id } })
                            .then(({ code }) =>
                              copyLink(`${SITE_URL}/${code}`, (m) => toast.success(m)),
                            )
                            .catch((error) =>
                              toast.error(
                                error instanceof Error ? error.message : "Could not create link",
                              ),
                            )
                        }
                      >
                        Copy link
                      </Btn>
                      <EmailButton
                        label="Email link"
                        subject={`Contract to sign: ${c.title || "Agreement"}`}
                        body={`Please sign the contract here:\n${SITE_URL}/sign/${c.token}\n\nThank you.`}
                        clientEmail={contacts.find((x) => x.id === c.contact_id)?.email}
                        clientName={nameOf(c.contact_id) || c.signer_name}
                      />
                      <Btn onClick={() => onOpen(c.id)}>Open</Btn>
                      {c.drive_link ? (
                        <a
                          href={c.drive_link}
                          target="_blank"
                          rel="noreferrer"
                          className="border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase hover:border-foreground"
                        >
                          Drive
                        </a>
                      ) : null}
                      <Btn variant="danger" onClick={() => onDelete(c.id)}>
                        Delete
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Detail = Awaited<ReturnType<typeof getContractDetail>>;

function ContractEditor({
  id,
  contacts,
  onBack,
}: {
  id: string;
  contacts: { id: string; name: string; email?: string }[];
  onBack: () => void;
}) {
  const detailFn = useServerFn(getContractDetail);
  const saveFields = useServerFn(saveContractFields);
  const saveSharing = useServerFn(updateContractSharing);
  const listRows = useServerFn(crmList);
  const shortLink = useServerFn(contractShortLink);

  const [detail, setDetail] = useState<Detail | null>(null);
  const [fields, setFields] = useState<ContractField[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [role, setRole] = useState<"client" | "me">("client");
  const [open, setOpen] = useState<string>("add");
  const [currentPage, setCurrentPage] = useState(1);
  const [menu, setMenu] = useState<{
    sx: number;
    sy: number;
    page: number;
    x: number;
    y: number;
  } | null>(null);
  const [bookings, setBookings] = useState<{ id: string; label: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState({
    title: "",
    message: "",
    status: "draft",
    accessCode: "",
    password: "",
    expiresAt: "",
    contactId: "",
    bookingId: "",
    timezone: DEFAULT_TIMEZONE,
  });

  useEffect(() => {
    void (async () => {
      try {
        const d = await detailFn({ data: { id } });
        setDetail(d);
        setFields(d.fields);
        setShare({
          title: d.title,
          message: d.message,
          status: d.status,
          accessCode: d.accessCode,
          password: "",
          expiresAt: d.expiresAt ? String(d.expiresAt).slice(0, 10) : "",
          contactId: d.contactId ?? "",
          bookingId: (d as { bookingId?: string | null }).bookingId ?? "",
          timezone: d.timezone || DEFAULT_TIMEZONE,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not open contract");
      }
    })();
  }, [detailFn, id]);

  // Bookings the signed contract can be attached to.
  useEffect(() => {
    void (async () => {
      try {
        const rows = await listRows({
          data: { table: "crm_bookings", orderBy: "starts_at", ascending: false },
        });
        setBookings(
          rows.map((r) => ({
            id: String(r["id"]),
            label: [
              String(r["title"] ?? "Booking"),
              r["starts_at"] ? String(r["starts_at"]).slice(0, 10) : "",
            ]
              .filter(Boolean)
              .join(" · "),
          })),
        );
      } catch {
        /* bookings optional */
      }
    })();
  }, [listRows]);

  // Dismiss the right-click field menu on any outside interaction.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  const { pages, error } = usePdfPages(detail?.fileUrl ?? "");
  const active = fields.find((f) => f.id === selected) ?? null;

  function patch(fieldId: string, next: Partial<ContractField>) {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, ...next } : f)));
  }

  async function persist() {
    setBusy(true);
    try {
      await saveFields({ data: { contractId: id, fields } });
      await saveSharing({
        data: {
          id,
          title: share.title,
          message: share.message,
          status: share.status,
          accessCode: share.accessCode,
          expiresAt: share.expiresAt || null,
          contactId: share.contactId || null,
          bookingId: share.bookingId || null,
          timezone: share.timezone,
          ...(share.password ? { password: share.password } : {}),
        },
      });
      toast.success("Contract saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  /** Drag a field around — and across pages by dropping it on another page. */
  function startDrag(fieldId: string, e: React.PointerEvent) {
    e.preventDefault();
    const start = fields.find((f) => f.id === fieldId);
    if (!start) return;
    const pageEl = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-pdf-page]");
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const grabX = e.clientX - (rect.left + start.x * rect.width);
    const grabY = e.clientY - (rect.top + start.y * rect.height);

    const move = (ev: PointerEvent) => {
      const under = document
        .elementsFromPoint(ev.clientX, ev.clientY)
        .find((n): n is HTMLElement => n instanceof HTMLElement && n.hasAttribute("data-pdf-page"));
      const host = under ?? pageEl;
      const r = host.getBoundingClientRect();
      const page = Number(host.dataset["pdfPage"] ?? start.page);
      patch(fieldId, {
        page,
        x: Math.min(0.99 - start.w, Math.max(0, (ev.clientX - grabX - r.left) / r.width)),
        y: Math.min(0.99 - start.h, Math.max(0, (ev.clientY - grabY - r.top) / r.height)),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /** Corner handle resize. */
  function startResize(fieldId: string, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const start = fields.find((f) => f.id === fieldId);
    const pageEl = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-pdf-page]");
    if (!start || !pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      patch(fieldId, {
        w: Math.min(
          0.98,
          Math.max(0.03, (ev.clientX - (rect.left + start.x * rect.width)) / rect.width),
        ),
        h: Math.min(
          0.5,
          Math.max(0.015, (ev.clientY - (rect.top + start.y * rect.height)) / rect.height),
        ),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const clientFields = fields.filter((f) => (f.role ?? "client") === "client");
  const myFields = fields.filter((f) => f.role === "me");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Btn onClick={onBack}>← Contracts</Btn>
          <h2 className="mt-4 font-display text-2xl">{share.title || "Contract"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {clientFields.length} client field{clientFields.length === 1 ? "" : "s"} ·{" "}
            {myFields.length} of mine
            {detail?.signedAt ? ` · signed ${formatInZone(detail.signedAt, share.timezone)}` : ""}
          </p>
        </div>
        {detail?.signedUrl ? (
          <a
            href={detail.signedUrl}
            target="_blank"
            rel="noreferrer"
            className="border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase hover:border-foreground"
          >
            Signed PDF
          </a>
        ) : null}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <PdfViewer
          pages={pages}
          error={error}
          fileUrl={detail?.fileUrl ?? ""}
          onPageChange={setCurrentPage}
          onPageContextMenu={(page, x, y, event) =>
            setMenu({ sx: event.clientX, sy: event.clientY, page, x, y })
          }
        >
          {(page) => (
            <>
              {fields
                .filter((f) => f.page === page.index)
                .map((f) => {
                  const mine = f.role === "me";
                  return (
                    <div
                      key={f.id}
                      onPointerDown={(e) => {
                        setSelected(f.id);
                        setOpen("field");
                        startDrag(f.id, e);
                      }}
                      style={{
                        left: `${f.x * 100}%`,
                        top: `${f.y * 100}%`,
                        width: `${f.w * 100}%`,
                        height: `${f.h * 100}%`,
                        containerType: "size",
                      }}
                      className={`absolute flex cursor-move items-center justify-center overflow-hidden border-2 leading-none ${
                        selected === f.id
                          ? "border-foreground bg-foreground/15"
                          : mine
                            ? "border-emerald-500/70 bg-emerald-500/10"
                            : "border-sky-500/70 bg-sky-500/10"
                      }`}
                    >
                      {f.value && (f.kind === "signature" || f.kind === "initials") ? (
                        <img
                          src={f.value}
                          alt={f.label}
                          className="h-full w-full object-contain object-left"
                        />
                      ) : (
                        <span
                          className="w-full overflow-hidden whitespace-nowrap px-[2%] leading-none text-neutral-800"
                          style={{
                            fontSize: fieldFontCss(Number(f.font_size) || DEFAULT_FIELD_PT, f.h),
                            fontWeight: f.bold ? 700 : 400,
                          }}
                        >
                          {fieldDisplay(f.kind, f.value) || f.label}
                        </span>
                      )}

                      <span
                        onPointerDown={(e) => startResize(f.id, e)}
                        className="absolute right-0 bottom-0 size-3 cursor-nwse-resize bg-foreground"
                      />
                    </div>
                  );
                })}
            </>
          )}
        </PdfViewer>

        <div className="space-y-3 lg:sticky lg:top-8 lg:self-start">
          <div className="flex border border-hairline">
            {(["client", "me"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 px-3 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors ${
                  role === r ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                {r === "client" ? "For client" : "For me"}
              </button>
            ))}
          </div>

          <Accordion
            title="Add a field"
            hint="Adds to the page you're viewing — or right-click the document to drop one exactly where you want"
            open={open === "add"}
            onToggle={() => setOpen(open === "add" ? "" : "add")}
          >
            <div className="grid grid-cols-2 gap-2">
              {FIELD_KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => {
                    const f = newField(currentPage, k.value, role, share.timezone);
                    setFields((prev) => [...prev, f]);
                    setSelected(f.id);
                    setOpen("field");
                  }}
                  className="border border-hairline px-3 py-2 text-left transition-colors hover:border-foreground"
                >
                  <span className="block text-xs">{k.label}</span>
                  <span className="mt-0.5 block text-[0.625rem] text-muted-foreground">
                    {k.hint}
                  </span>
                </button>
              ))}
            </div>
          </Accordion>

          <Accordion
            title="Selected field"
            hint={active ? active.label : "Nothing selected"}
            open={open === "field"}
            onToggle={() => setOpen(open === "field" ? "" : "field")}
          >
            {active ? (
              <div className="space-y-4">
                <TextField
                  label="Label"
                  value={active.label}
                  onChange={(v) => patch(active.id, { label: v })}
                />
                <div className="flex gap-2">
                  {(["client", "me"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => patch(active.id, { role: r })}
                      className={`flex-1 border px-3 py-2 text-[0.625rem] tracking-[0.18em] uppercase ${
                        (active.role ?? "client") === r
                          ? "border-foreground bg-foreground text-background"
                          : "border-hairline text-muted-foreground"
                      }`}
                    >
                      {r === "client" ? "Client fills" : "I fill"}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => patch(active.id, { required: !active.required })}
                  className="flex w-full items-center justify-between border border-hairline px-3 py-2 text-xs"
                >
                  Required
                  <span className={active.required ? "text-foreground" : "text-muted-foreground"}>
                    {active.required ? "Yes" : "Optional"}
                  </span>
                </button>
                <div>
                  <Label>Page</Label>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Array.from(
                      { length: pages?.length ?? detail?.pageCount ?? 1 },
                      (_, i) => i + 1,
                    ).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => patch(active.id, { page: p })}
                        className={`size-8 border text-xs ${
                          active.page === p
                            ? "border-foreground bg-foreground text-background"
                            : "border-hairline"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label>Width</Label>
                    <input
                      type="range"
                      min={3}
                      max={95}
                      value={Math.round(active.w * 100)}
                      onChange={(e) => patch(active.id, { w: Number(e.target.value) / 100 })}
                      className="mt-2 w-full accent-foreground"
                    />
                  </div>
                  <div>
                    <Label>Height</Label>
                    <input
                      type="range"
                      min={2}
                      max={40}
                      value={Math.round(active.h * 100)}
                      onChange={(e) => patch(active.id, { h: Number(e.target.value) / 100 })}
                      className="mt-2 w-full accent-foreground"
                    />
                  </div>
                  <div>
                    <Label>Text size · {Number(active.font_size) || DEFAULT_FIELD_PT} pt</Label>
                    <input
                      type="range"
                      min={6}
                      max={36}
                      value={Number(active.font_size) || DEFAULT_FIELD_PT}
                      onChange={(e) => patch(active.id, { font_size: Number(e.target.value) })}
                      className="mt-2 w-full accent-foreground"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => patch(active.id, { bold: !active.bold })}
                    className="flex w-full items-center justify-between border border-hairline px-3 py-2 text-xs"
                  >
                    Bold text
                    <span className={active.bold ? "text-foreground" : "text-muted-foreground"}>
                      {active.bold ? "On" : "Off"}
                    </span>
                  </button>
                </div>
                {active.role === "me" ? (
                  active.kind === "signature" || active.kind === "initials" ? (
                    <SignatureInput
                      label="My signature"
                      value={active.value}
                      onChange={(v) => patch(active.id, { value: v })}
                    />
                  ) : (
                    <TextField
                      label="My answer"
                      type={active.kind === "date" ? "date" : "text"}
                      value={active.value}
                      onChange={(v) => patch(active.id, { value: v })}
                    />
                  )
                ) : null}
                <Btn
                  variant="danger"
                  onClick={() => {
                    setFields((p) => p.filter((f) => f.id !== active.id));
                    setSelected(null);
                  }}
                >
                  Remove field
                </Btn>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Add a field or click one on the document to edit it.
              </p>
            )}
          </Accordion>

          <Accordion
            title="Sharing"
            hint={share.status === "sent" ? "Live — ready to sign" : share.status}
            open={open === "share"}
            onToggle={() => setOpen(open === "share" ? "" : "share")}
          >
            <div className="space-y-4">
              <TextField
                label="Title"
                value={share.title}
                onChange={(v) => setShare({ ...share, title: v })}
              />
              <SelectField
                label="Client"
                value={share.contactId}
                onChange={(v) => setShare({ ...share, contactId: v })}
                options={[
                  { value: "", label: "— none —" },
                  ...contacts.map((c) => ({ value: c.id, label: c.name || "Unnamed" })),
                ]}
              />
              <SelectField
                label="Booking"
                value={share.bookingId}
                onChange={(v) => setShare({ ...share, bookingId: v })}
                options={[
                  { value: "", label: "— none —" },
                  ...bookings.map((b) => ({ value: b.id, label: b.label })),
                ]}
              />
              <AreaField
                label="Note shown above the document"
                value={share.message}
                onChange={(v) => setShare({ ...share, message: v })}
              />
              <div>
                <Label>Status</Label>
                <div className="mt-2 flex gap-2">
                  {[
                    { v: "draft", l: "Draft" },
                    { v: "sent", l: "Live" },
                    { v: "void", l: "Void" },
                  ].map((s) => (
                    <button
                      key={s.v}
                      type="button"
                      onClick={() => setShare({ ...share, status: s.v })}
                      className={`flex-1 border px-3 py-2 text-[0.625rem] tracking-[0.18em] uppercase ${
                        share.status === s.v
                          ? "border-foreground bg-foreground text-background"
                          : "border-hairline text-muted-foreground"
                      }`}
                    >
                      {s.l}
                    </button>
                  ))}
                </div>
              </div>
              <TextField
                label="Access code (optional)"
                value={share.accessCode}
                onChange={(v) => setShare({ ...share, accessCode: v })}
                onReset={() => {
                  if (!window.confirm("Clear the access code on this contract?")) return;
                  void saveSharing({ data: { id, accessCode: "" } })
                    .then(() => {
                      setShare({ ...share, accessCode: "" });
                      toast.success("Access code reset");
                    })
                    .catch((err) =>
                      toast.error(err instanceof Error ? err.message : "Could not reset"),
                    );
                }}
                resetHint="Clears the code"
              />
              <TextField
                label="Password (leave blank to keep)"
                type="password"
                value={share.password}
                onChange={(v) => setShare({ ...share, password: v })}
                onReset={() => {
                  if (!window.confirm("Clear the password on this contract?")) return;
                  void saveSharing({ data: { id, password: "" } })
                    .then(() => {
                      setShare({ ...share, password: "" });
                      toast.success("Password reset");
                    })
                    .catch((err) =>
                      toast.error(err instanceof Error ? err.message : "Could not reset"),
                    );
                }}
                resetHint="Opens without a password"
              />

              <div className="border border-hairline p-3">
                <p className="text-xs text-muted-foreground">
                  Forgot the code or password? Clear both so the client link opens without asking
                  for anything.
                </p>
                <Btn
                  className="mt-3"
                  onClick={() => {
                    if (!window.confirm("Reset the access code and password on this contract?"))
                      return;
                    void saveSharing({ data: { id, accessCode: "", password: "" } })
                      .then(() => {
                        setShare({ ...share, accessCode: "", password: "" });
                        toast.success("Access code and password reset");
                      })
                      .catch((err) =>
                        toast.error(err instanceof Error ? err.message : "Could not reset"),
                      );
                  }}
                >
                  Reset client access
                </Btn>
              </div>

              <TextField
                label="Expires on"
                type="date"
                value={share.expiresAt}
                onChange={(v) => setShare({ ...share, expiresAt: v })}
              />
              <SelectField
                label="Time zone (dates and signing time)"
                value={share.timezone}
                onChange={(v) => setShare({ ...share, timezone: v })}
                options={TIMEZONE_OPTIONS}
              />
              <p className="text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
                Now: {formatInZone(new Date(), share.timezone)}
              </p>
            </div>
          </Accordion>

          <div className="flex flex-wrap gap-2 border border-hairline bg-background p-3">
            <Btn variant="solid" disabled={busy} onClick={() => void persist()} className="flex-1">
              {busy ? "Saving…" : "Save contract"}
            </Btn>
            {detail?.token ? (
              <Btn
                className="flex-1"
                onClick={() =>
                  void shortLink({ data: { id } })
                    .then(({ code }) => copyLink(`${SITE_URL}/${code}`, (m) => toast.success(m)))
                    .catch((error) =>
                      toast.error(error instanceof Error ? error.message : "Could not create link"),
                    )
                }
              >
                Copy client link
              </Btn>
            ) : null}
          </div>
        </div>
      </div>

      {menu ? (
        <div
          style={{
            left: Math.min(menu.sx, window.innerWidth - 200),
            top: Math.min(menu.sy, window.innerHeight - 300),
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed z-[90] w-48 border border-hairline bg-background shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
        >
          <p className="border-b border-hairline px-3 py-2 text-[0.55rem] tracking-[0.2em] uppercase text-muted-foreground">
            Add field · {role === "client" ? "client" : "me"}
          </p>
          {FIELD_KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => {
                const f = newField(menu.page, k.value, role, share.timezone, {
                  x: menu.x,
                  y: menu.y,
                });
                setFields((prev) => [...prev, f]);
                setSelected(f.id);
                setOpen("field");
                setMenu(null);
              }}
              className="block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-foreground hover:text-background"
            >
              {k.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
