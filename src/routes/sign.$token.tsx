import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { openContract, signContract } from "@/lib/contracts.functions";
import type { PublicContract } from "@/lib/contracts.server";
import { usePdfPages } from "@/components/crm/PdfPages";
import { PdfViewer } from "@/components/crm/PdfViewer";
import { SignatureInput } from "@/components/crm/SignatureInput";
import { Btn, Card, Label, TextField } from "@/components/crm/ui";
import { formatInZone, todayInZone } from "@/lib/timezones";
import { DEFAULT_FIELD_PT, fieldDisplay, fieldFontCss } from "@/lib/contract-fields";

export const Route = createFileRoute("/sign/$token")({
  head: () => ({
    meta: [
      { title: "Sign your contract | Shutter Ram" },
      { name: "description", content: "Review and sign your photography contract online." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Sign your contract | Shutter Ram" },
      { property: "og:description", content: "Review and sign your photography contract online." },
    ],
  }),
  component: SignPage,
});

const today = (tz?: string | null) => todayInZone(tz);

function SignPage() {
  const { token } = Route.useParams();
  const open = useServerFn(openContract);
  const submit = useServerFn(signContract);

  const [contract, setContract] = useState<PublicContract | null>(null);
  const [gate, setGate] = useState<{ need: string; reason: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [boxes, setBoxes] = useState<Record<string, { w: number; h: number }>>({});
  const [signer, setSigner] = useState({ name: "", email: "", phone: "" });
  const [active, setActive] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputsRef = useRef<Record<string, HTMLDivElement | null>>({});

  async function load(withCode = code, withPassword = password) {
    try {
      const res = await open({ data: { token, code: withCode, password: withPassword } });
      if (res.ok) {
        setContract(res);
        setGate(null);
        // Pre-fill saved answers; dates default to today so nothing is left blank.
        setValues((prev) => {
          const next = { ...prev };
          for (const f of res.fields) {
            if ((f.role ?? "client") !== "client") continue;
            if (next[f.id]) continue;
            if (f.value) next[f.id] = f.value;
            else if (f.kind === "date") next[f.id] = today(res.timezone);
          }
          return next;
        });
      } else {
        setContract(null);
        setGate({ need: res.need, reason: res.reason });
      }
    } catch (error) {
      setGate({
        need: "missing",
        reason: error instanceof Error ? error.message : "Could not open this contract.",
      });
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const signedAt = contract?.signedAt ?? null;
  const showSigned = Boolean(signedAt) && !editing;
  const viewUrl = showSigned ? contract?.signedUrl || contract?.fileUrl : contract?.fileUrl;
  const { pages, error } = usePdfPages(viewUrl ?? "");

  if (gate) {
    const needsInput = gate.need === "code" || gate.need === "password";
    return (
      <main className="mx-auto max-w-md px-6 pb-24 pt-56">
        <Card>
          <h1 className="font-display text-2xl">
            {needsInput ? "Protected document" : "Link unavailable"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{gate.reason}</p>
          {needsInput ? (
            <div className="mt-6 space-y-4">
              {gate.need === "code" ? (
                <TextField label="Access code" value={code} onChange={setCode} />
              ) : (
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                />
              )}
              <Btn variant="solid" onClick={() => void load()}>
                Open contract
              </Btn>
            </div>
          ) : null}
        </Card>
      </main>
    );
  }

  if (!contract) {
    return (
      <main className="px-6 pb-24 pt-56 text-center text-sm text-muted-foreground">Loading…</main>
    );
  }

  const doc = contract;
  const myFields = doc.fields.filter((f) => (f.role ?? "client") === "client");
  const remaining = myFields.filter((f) => f.required && !values[f.id]).length;

  function boxOf(id: string, w: number, h: number) {
    return boxes[id] ?? { w, h };
  }

  function focusField(id: string) {
    setActive(id);
    setSheetOpen(true);
    window.setTimeout(
      () => inputsRef.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" }),
      120,
    );
  }

  /** Clients may resize their own signature / text boxes to fit their writing. */
  function startResize(id: string, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const pageEl = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-pdf-page]");
    const field = doc.fields.find((f) => f.id === id);
    if (!pageEl || !field) return;
    const rect = pageEl.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      setBoxes((prev) => ({
        ...prev,
        [id]: {
          w: Math.min(
            0.95,
            Math.max(0.03, (ev.clientX - (rect.left + field.x * rect.width)) / rect.width),
          ),
          h: Math.min(
            0.4,
            Math.max(0.015, (ev.clientY - (rect.top + field.y * rect.height)) / rect.height),
          ),
        },
      }));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  async function sign() {
    if (!signer.name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    setBusy(true);
    try {
      const res = await submit({
        data: { token, code, password, values, boxes, signer, resign: Boolean(signedAt) },
      });
      if (res.ok) {
        toast.success("Contract signed — your copy is ready");
        setEditing(false);
        await load();
      } else {
        toast.error(res.reason);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  const panel = (
    <>
      {signedAt ? (
        <Card>
          <p className="text-sm text-muted-foreground md:text-xs">
            You are re-signing this contract. Submitting replaces the previous signed copy.
          </p>
          <div className="mt-3">
            <Btn onClick={() => setEditing(false)}>Cancel</Btn>
          </div>
        </Card>
      ) : null}

      <>


          <Card>
            <Label>Your details</Label>
            <div className="mt-3 space-y-3">
              <TextField
                label="Full name"
                value={signer.name}
                onChange={(v) => setSigner({ ...signer, name: v })}
              />
              <TextField
                label="Email (optional)"
                value={signer.email}
                onChange={(v) => setSigner({ ...signer, email: v })}
              />
              <TextField
                label="Phone (optional)"
                value={signer.phone}
                onChange={(v) => setSigner({ ...signer, phone: v })}
              />
            </div>
          </Card>

          {myFields.length ? (
            <Card>
              <div className="flex items-center justify-between">
                <Label>Complete the document</Label>
                <span className="text-[0.625rem] tracking-[0.18em] uppercase text-muted-foreground">
                  {remaining ? `${remaining} left` : "All done"}
                </span>
              </div>
              <div className="mt-4 space-y-6">
                {myFields.map((f) => (
                  <div
                    key={f.id}
                    ref={(el) => {
                      inputsRef.current[f.id] = el;
                    }}
                    onFocus={() => setActive(f.id)}
                    className={`border-l-2 pl-3 transition-colors ${
                      active === f.id ? "border-foreground" : "border-transparent"
                    }`}
                  >
                    {f.kind === "signature" || f.kind === "initials" ? (
                      <SignatureInput
                        label={f.label + (f.required ? " *" : "")}
                        value={values[f.id] ?? ""}
                        onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))}
                      />
                    ) : f.kind === "checkbox" ? (
                      <label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={values[f.id] === "true"}
                          onChange={(e) =>
                            setValues((prev) => ({ ...prev, [f.id]: String(e.target.checked) }))
                          }
                          className="size-4"
                        />
                        {f.label}
                      </label>
                    ) : (
                      <TextField
                        label={f.label + (f.required ? " *" : "")}
                        type={
                          f.kind === "date"
                            ? "date"
                            : f.kind === "email"
                              ? "email"
                              : f.kind === "phone"
                                ? "tel"
                                : "text"
                        }
                        value={values[f.id] ?? ""}
                        onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Btn variant="solid" disabled={busy} onClick={() => void sign()} className="w-full">
            {busy ? "Submitting…" : signedAt ? "Re-sign and submit" : "Sign and submit"}
          </Btn>
      </>

      {doc.footerNote ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{doc.footerNote}</p>
      ) : null}
    </>
  );

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-56">
      <p className="eyebrow">Contract</p>
      <h1 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.75rem)]">{doc.title}</h1>
      {doc.message ? (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {doc.message}
        </p>
      ) : null}

      <div className="mt-10">
        <PdfViewer
          pages={pages}
          error={error}
          fileUrl={viewUrl ?? ""}
          notice={
            signedAt
              ? `Signed on ${formatInZone(signedAt, contract?.timezone)}${
                  showSigned ? " — you are viewing your signed copy." : " — re-signing in progress."
                }`
              : undefined
          }
        >
          {(page) =>
            showSigned ? null : (
              <>
                {doc.fields
                  .filter((f) => f.page === page.index)
                  .map((f) => {
                    const mine = (f.role ?? "client") === "client";
                    const val = mine
                      ? (values[f.id] ?? "")
                      : f.value || (f.kind === "date" ? today(contract?.timezone) : "");
                    const box = boxOf(f.id, f.w, f.h);
                    return (
                      <div
                        key={f.id}
                        onClick={() => mine && focusField(f.id)}
                        style={{
                          left: `${f.x * 100}%`,
                          top: `${f.y * 100}%`,
                          width: `${box.w * 100}%`,
                          height: `${box.h * 100}%`,
                          containerType: "size",
                        }}
                        className={`absolute flex items-center justify-center overflow-hidden ${
                          mine
                            ? `cursor-pointer border-2 border-dashed ${
                                active === f.id
                                  ? "border-sky-500 bg-sky-500/15"
                                  : "border-sky-500/60 bg-sky-500/5"
                              }`
                            : ""
                        }`}
                      >
                        {val && (f.kind === "signature" || f.kind === "initials") ? (
                          <img
                            src={val}
                            alt={f.label}
                            className="h-full w-full object-contain object-left"
                          />
                        ) : (
                          <span
                            className={`w-full overflow-hidden whitespace-nowrap px-[2%] leading-none ${
                              val ? "text-neutral-900" : "text-sky-700"
                            }`}
                            style={{
                              fontSize: fieldFontCss(
                                Number(f.font_size) ||
                                  (f.kind === "date" ? doc.defaultDatePt : doc.defaultFieldPt) ||
                                  DEFAULT_FIELD_PT,
                                box.h,
                              ),
                              fontWeight: f.bold ? 700 : 400,
                            }}
                          >
                            {val
                              ? fieldDisplay(f.kind, val)
                              : mine
                                ? `${f.label}${f.required ? " *" : ""}`
                                : ""}
                          </span>
                        )}
                        {mine ? (
                          <span
                            onPointerDown={(e) => startResize(f.id, e)}
                            className="absolute right-0 bottom-0 size-3 cursor-nwse-resize bg-sky-500"
                          />
                        ) : null}
                      </div>
                    );
                  })}
              </>
            )
          }
        </PdfViewer>

        <FloatingPanel
          open={sheetOpen}
          onOpen={() => {
            if (showSigned) setEditing(true);
            setSheetOpen(true);
          }}
          onClose={() => setSheetOpen(false)}
          openLabel={
            showSigned
              ? "Edit & re-sign"
              : remaining
                ? `Fill & sign · ${remaining} left`
                : "Review & sign"
          }
          downloadUrl={doc.signedUrl || ""}
          title={remaining ? `Sign · ${remaining} left` : "Review & sign"}
        >
          {panel}
        </FloatingPanel>

      </div>
    </main>
  );
}

/**
 * Floating signing panel. Starts as a small button bar ("Fill & sign",
 * "Download copy") so nothing large covers the document; opening it reveals a
 * draggable window that is always clamped fully inside the viewport.
 */
function FloatingPanel({
  open,
  onOpen,
  onClose,
  openLabel,
  downloadUrl,
  title,
  children,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  openLabel: string;
  downloadUrl: string;
  title: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  const clamp = (x: number, y: number) => {
    const el = boxRef.current;
    const w = el?.offsetWidth ?? Math.min(360, window.innerWidth - 24);
    const h = el?.offsetHeight ?? 320;
    return {
      x: Math.min(Math.max(8, x), Math.max(8, window.innerWidth - w - 8)),
      y: Math.min(Math.max(8, y), Math.max(8, window.innerHeight - h - 8)),
    };
  };

  // Whenever the panel opens, place it fully inside the viewport.
  useEffect(() => {
    if (!mounted || !open) return;
    const place = () => {
      const el = boxRef.current;
      const w = el?.offsetWidth ?? Math.min(376, window.innerWidth - 24);
      // Spawn high on the screen so the tall window stays fully visible.
      setPos(clamp(window.innerWidth - w - 16, 72));

    };
    place();
    const t = window.setTimeout(place, 60);
    window.addEventListener("resize", place);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", place);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, open]);

  function startDrag(e: React.PointerEvent) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      setPos(clamp(ev.clientX - d.dx, ev.clientY - d.dy));
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  if (!mounted) return null;

  const chip =
    "px-5 py-3 text-[0.7rem] md:text-[0.625rem] tracking-[0.2em] uppercase shadow-[0_18px_50px_rgba(0,0,0,0.45)]";

  if (!open) {
    return createPortal(
      <div className="fixed inset-x-0 bottom-5 z-[95] flex flex-wrap justify-center gap-2 px-4">
        <button
          type="button"
          onClick={onOpen}
          className={`border border-neutral-900 bg-neutral-900 text-white ${chip}`}
        >
          {openLabel}
        </button>
        {downloadUrl ? (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className={`border border-neutral-900 bg-neutral-900 text-white ${chip}`}
          >
            Download copy
          </a>
        ) : null}
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      ref={boxRef}
      style={{
        left: pos?.x ?? 12,
        top: pos?.y ?? 12,
        width: "min(23.5rem, calc(100vw - 1.5rem))",
        visibility: pos ? "visible" : "hidden",
      }}
      className="fixed z-[95] border border-hairline bg-background shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
    >
      <div
        onPointerDown={startDrag}
        className="flex cursor-move touch-none items-center gap-2 border-b border-hairline px-3 py-2.5"
      >
        <span className="text-[0.7rem] tracking-[0.24em] text-muted-foreground">⠿</span>
        <span className="flex-1 truncate text-[0.7rem] tracking-[0.2em] uppercase md:text-[0.625rem]">
          {title}
        </span>
        <button
          type="button"
          onClick={onClose}
          title="Minimise"
          className="flex size-8 items-center justify-center border border-hairline text-sm transition-colors hover:border-foreground"
        >
          –
        </button>
      </div>
      <div className="relative">
        <div
          onScroll={(e) => setAtEnd(e.currentTarget.scrollTop + e.currentTarget.clientHeight >= e.currentTarget.scrollHeight - 8)}
          className="max-h-[calc(100dvh-11rem)] space-y-5 overflow-y-auto p-4 text-[0.95rem] md:text-sm"
        >
          {children}
        </div>
        {atEnd ? null : (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-background to-transparent pt-8 pb-1.5">
            <span className="text-[0.65rem] tracking-[0.2em] uppercase text-muted-foreground">
              Scroll for more ↓
            </span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}


