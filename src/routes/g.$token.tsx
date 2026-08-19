import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import {
  openGallery,
  saveGalleryPick,
  setGalleryClientPassword,
  submitGallery,
} from "@/lib/gallery.functions";
import type { PublicGallery, PublicGalleryImage } from "@/lib/gallery.server";
import { Btn, Card, Label, SelectField, TextField } from "@/components/crm/ui";
import { ViewSelector, type ColumnCount } from "@/components/site/ViewSelector";

const GRID_CLASS: Record<ColumnCount, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-2",
  "3": "grid-cols-3",
};

const asCols = (v: string | undefined): ColumnCount =>
  v === "1" || v === "2" || v === "3" ? v : "2";


export const Route = createFileRoute("/g/$token")({
  head: () => ({
    meta: [
      { title: "Your gallery | Shutter Ram" },
      { name: "description", content: "View and choose your photographs from your private gallery." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Your gallery | Shutter Ram" },
      { property: "og:description", content: "View and choose your photographs." },
    ],
  }),
  component: ClientGalleryPage,
});

function ClientGalleryPage() {
  const { token } = Route.useParams();
  const open = useServerFn(openGallery);
  const savePick = useServerFn(saveGalleryPick);
  const submit = useServerFn(submitGallery);
  const setPassword = useServerFn(setGalleryClientPassword);

  const [gallery, setGallery] = useState<PublicGallery | null>(null);
  const [gate, setGate] = useState<{ need: string; reason: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPasswordValue] = useState("");
  const [images, setImages] = useState<PublicGalleryImage[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [onlyPicked, setOnlyPicked] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [askPassword, setAskPassword] = useState(false);
  const [askedOnce, setAskedOnce] = useState(false);
  const [sort, setSort] = useState("default");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [cols, setCols] = useState<ColumnCount | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const read = () =>
      setDevice(
        window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
      );
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);


  async function load() {
    try {
      const res = await open({ data: { token, code, password } });
      if (res.ok) {
        setGallery(res);
        setImages(res.images);
        setGate(null);
        // Offer a private password right away instead of burying it below the photos.
        if (res.allowClientPassword && !res.hasClientPassword && !askedOnce) {
          setAskedOnce(true);
          setAskPassword(true);
        }
      } else {
        setGallery(null);
        setGate({ need: res.need, reason: res.reason });
      }
    } catch (error) {
      setGate({
        need: "missing",
        reason: error instanceof Error ? error.message : "Could not open this gallery.",
      });
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? i : Math.min(images.length - 1, i + 1)));
      if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? i : Math.max(0, i - 1)));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, images.length]);

  if (gate) {
    const needsInput = gate.need === "code" || gate.need === "password";
    return (
      <main className="mx-auto max-w-md px-6 pb-24 pt-56">
        <Card>
          <h1 className="font-display text-2xl">
            {needsInput ? "Private gallery" : "Link unavailable"}
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
                  onChange={setPasswordValue}
                />
              )}
              <Btn variant="solid" onClick={() => void load()}>
                Open gallery
              </Btn>
            </div>
          ) : null}
        </Card>
      </main>
    );
  }

  if (!gallery) {
    return <main className="px-6 pb-24 pt-56 text-center text-sm text-muted-foreground">Loading…</main>;
  }

  const isCull = gallery.kind === "cull";
  const pickedCount = images.filter((i) => i.picked).length;
  const submitted = gallery.submitted;
  // After submitting, picks are locked until the client explicitly re-opens editing.
  const locked = isCull && submitted && !editing;
  const gridDefault = asCols(
    device === "mobile"
      ? gallery.gridMobile
      : device === "tablet"
        ? gallery.gridTablet
        : gallery.gridDesktop,
  );
  const columns = cols ?? gridDefault;
  const base = onlyPicked ? images.filter((i) => i.picked) : images;
  const shown = [...base];
  if (sort === "name") shown.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (sort === "name-desc") shown.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
  if (sort === "picked") shown.sort((a, b) => Number(b.picked) - Number(a.picked));

  async function patch(image: PublicGalleryImage, patchValue: Partial<PublicGalleryImage>) {
    if (locked) {
      toast.error("Tap “Edit selection” to change your picks.");
      return;
    }
    if (

      patchValue.picked &&
      gallery!.maxPicks > 0 &&
      pickedCount >= gallery!.maxPicks &&
      !image.picked
    ) {
      toast.error(`You can pick up to ${gallery!.maxPicks} photos.`);
      return;
    }
    setImages((prev) => prev.map((i) => (i.id === image.id ? { ...i, ...patchValue } : i)));
    const res = await savePick({
      data: {
        token,
        code,
        password,
        imageId: image.id,
        ...(patchValue.picked !== undefined ? { picked: patchValue.picked } : {}),
        ...(patchValue.rating !== undefined ? { rating: patchValue.rating } : {}),
        ...(patchValue.label !== undefined ? { label: patchValue.label } : {}),
        ...(patchValue.comment !== undefined ? { comment: patchValue.comment } : {}),
      },
    });
    if (!res.ok) toast.error(res.reason ?? "Could not save your choice");
  }

  const current = lightbox === null ? null : shown[lightbox] ?? null;

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-56">
      <p className="eyebrow">{isCull ? "Photo selection" : "Your gallery"}</p>
      <h1 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.75rem)]">{gallery.title}</h1>
      {gallery.welcome || gallery.message ? (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {gallery.message || gallery.welcome}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <SelectField
            label="Sort"
            value={sort}
            onChange={setSort}
            options={[
              { value: "default", label: "Gallery order" },
              { value: "name", label: "File name A–Z" },
              { value: "name-desc", label: "File name Z–A" },
              ...(isCull ? [{ value: "picked", label: "Picked first" }] : []),
            ]}
          />
        </div>
        {isCull ? (
          <>
            <span className="text-xs text-muted-foreground">
              {pickedCount} picked
              {gallery.maxPicks ? ` of ${gallery.maxPicks}` : ""}
            </span>
            <Btn onClick={() => setOnlyPicked((v) => !v)}>
              {onlyPicked ? "Show all" : "Show picked only"}
            </Btn>
            {locked ? (
              <Btn variant="solid" onClick={() => setEditing(true)}>
                Edit selection
              </Btn>
            ) : (
              <Btn variant="solid" onClick={() => setConfirming(true)}>
                {submitted ? "Update selection" : "Submit selection"}
              </Btn>
            )}
          </>
        ) : null}
        {gallery.allowClientPassword ? (
          <Btn onClick={() => setPasswordOpen(true)}>
            {gallery.hasClientPassword ? "Change password" : "Set password"}
          </Btn>
        ) : null}
      </div>

      {isCull && (locked || submitted) ? (
        <p className={`mt-3 text-xs ${locked ? "text-muted-foreground" : "text-foreground"}`}>
          {locked
            ? "Submitted — tap “Edit selection” to make changes."
            : "Editing — your photos are highlighted. Update when you're done."}
        </p>
      ) : null}

      <div className="mt-6 flex justify-center">
        <ViewSelector value={columns} onChange={setCols} />
      </div>


      <div className={`mt-10 grid gap-3 ${GRID_CLASS[columns]}`}>
        {shown.map((img, index) => (
          <figure
            key={img.id}
            className={`group relative transition-shadow ${
              isCull && !locked
                ? img.picked
                  ? "ring-2 ring-foreground"
                  : "ring-1 ring-foreground/30 hover:ring-foreground/70"
                : ""
            }`}
          >
            <button
              type="button"
              onClick={() => setLightbox(index)}
              className="block w-full"
              aria-label={`Open ${img.name}`}
            >
              <img
                src={img.thumb}
                alt={img.name}
                loading="lazy"
                className="aspect-[4/5] w-full object-cover transition-opacity group-hover:opacity-90"
              />
            </button>
            {isCull ? (
              <button
                type="button"
                onClick={() => void patch(img, { picked: !img.picked })}
                disabled={locked}
                
                className={
                  "absolute left-0 top-0 px-3 py-2 text-[0.55rem] tracking-[0.2em] uppercase transition-colors " +
                  (img.picked
                    ? "bg-foreground text-background"
                    : "bg-background/80 text-muted-foreground hover:text-foreground")
                }
              >
                {img.picked ? "Picked" : "Pick"}
              </button>
            ) : null}
            {gallery.allowDownload ? (
              <a
                href={img.preview}
                download={img.name}
                className="absolute right-0 top-0 bg-background/80 px-3 py-2 text-[0.55rem] tracking-[0.2em] uppercase"
              >
                Save
              </a>
            ) : null}
            {gallery.showFilenames ? (
              <figcaption className="mt-1 truncate text-[0.65rem] text-muted-foreground">
                {img.name}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>

      {(passwordOpen || askPassword) && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/85 p-6 backdrop-blur-sm">
              <Card className="w-full max-w-sm">
                <Label>
                  {gallery.hasClientPassword
                    ? "Change your gallery password"
                    : "Set your own password"}
                </Label>
                <p className="mt-3 text-sm text-muted-foreground">
                  {gallery.hasClientPassword
                    ? "Choose a new password for this gallery."
                    : "You can keep using the code the photographer gave you, or set your own private password for this link."}
                </p>
                <div className="mt-4 space-y-3">
                  <TextField
                    label="New password"
                    type="password"
                    value={newPassword}
                    onChange={setNewPassword}
                  />
                  <TextField
                    label="Confirm password"
                    type="password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                  />
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters, including a letter and a number.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Btn
                    onClick={() => {
                      setPasswordOpen(false);
                      setAskPassword(false);
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    {askPassword && !gallery.hasClientPassword ? "Keep current code" : "Cancel"}
                  </Btn>
                  <Btn
                    variant="solid"
                    onClick={() => {
                      if (newPassword !== confirmPassword) {
                        toast.error("Passwords do not match.");
                        return;
                      }
                      if (
                        newPassword.length < 8 ||
                        !/[A-Za-z]/.test(newPassword) ||
                        !/[0-9]/.test(newPassword)
                      ) {
                        toast.error("Use at least 8 characters with a letter and a number.");
                        return;
                      }
                      void setPassword({ data: { token, code, password, newPassword } }).then(
                        (res) => {
                          if (res.ok) {
                            toast.success("Password saved — you'll need it next time.");
                            setNewPassword("");
                            setConfirmPassword("");
                            setPasswordOpen(false);
                            setAskPassword(false);
                            void load();
                          } else toast.error(res.reason ?? "Could not save password");
                        },
                      );
                    }}
                  >
                    Save password
                  </Btn>
                </div>
              </Card>
            </div>,
            document.body,
          )
        : null}


      {confirming && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/85 p-6 backdrop-blur-sm">
              <Card className="w-full max-w-sm">
                <Label>{submitted ? "Update your selection" : "Submit your selection"}</Label>
                <p className="mt-3 text-sm text-muted-foreground">
                  You're sending {pickedCount} picked photo{pickedCount === 1 ? "" : "s"}
                  {gallery.maxPicks ? ` of ${gallery.maxPicks}` : ""}. You can still edit and
                  update afterwards.
                </p>
                <div className="mt-6 flex gap-2">
                  <Btn onClick={() => setConfirming(false)}>Cancel</Btn>
                  <Btn
                    variant="solid"
                    onClick={() => {
                      setConfirming(false);
                      void submit({ data: { token, code, password } }).then((res) => {
                        if (res.ok) {
                          toast.success(submitted ? "Selection updated" : "Selection submitted");
                          setEditing(false);
                          void load();
                        } else toast.error(res.reason ?? "Could not submit");
                      });
                    }}
                  >
                    {submitted ? "Yes, update" : "Yes, submit"}
                  </Btn>
                </div>
              </Card>
            </div>,
            document.body,
          )
        : null}

      {current && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col bg-background/97 backdrop-blur-md animate-in fade-in duration-300"
              role="dialog"
              aria-modal="true"
              aria-label={current.name}
            >
              <div className="flex shrink-0 items-center justify-between px-6 py-5">
                <span className="eyebrow">
                  {String(lightbox! + 1).padStart(2, "0")} / {String(shown.length).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  aria-label="Close"
                  className="group inline-flex items-center gap-2 border border-hairline px-4 py-2 text-[0.6875rem] tracking-[0.24em] uppercase text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  Close
                  <X className="size-4" strokeWidth={1.4} />
                </button>
              </div>

              <div className="relative grid min-h-0 flex-1 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 overflow-hidden px-3 md:grid-cols-[4rem_minmax(0,1fr)_4rem] md:gap-4 md:px-8">
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() => setLightbox((i) => Math.max(0, (i ?? 0) - 1))}
                  className="flex shrink-0 items-center justify-center text-foreground/70 transition-all duration-500 hover:-translate-x-1 hover:text-foreground"
                >
                  <ChevronLeft className="size-7 md:size-9" strokeWidth={1} />
                </button>

                <img
                  key={current.id}
                  src={current.preview}
                  alt={current.name}
                  className="mx-auto h-full max-h-full w-auto max-w-full object-contain"
                  draggable={false}
                />

                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() => setLightbox((i) => Math.min(shown.length - 1, (i ?? 0) + 1))}
                  className="flex shrink-0 items-center justify-center text-foreground/70 transition-all duration-500 hover:translate-x-1 hover:text-foreground"
                >
                  <ChevronRight className="size-7 md:size-9" strokeWidth={1} />
                </button>
              </div>

              <div className="shrink-0 px-6 pb-8 pt-4">
                {gallery.showFilenames ? (
                  <p className="mb-3 text-center text-xs text-muted-foreground">{current.name}</p>
                ) : null}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {isCull ? (
                    <>
                      <Btn
                        variant={current.picked ? "solid" : "ghost"}
                        disabled={locked}
                        onClick={() => void patch(current, { picked: !current.picked })}
                      >
                        {current.picked ? "Picked" : "Pick this"}
                      </Btn>
                      {gallery.allowRating ? (
                        <div className="flex items-center gap-1 text-lg">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => void patch(current, { rating: n })}
                              className={n <= current.rating ? "text-foreground" : "text-muted-foreground"}
                              aria-label={`Rate ${n}`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {gallery.allowLabels ? (
                        <input
                          value={current.label}
                          placeholder="Label"
                          onChange={(e) => void patch(current, { label: e.target.value })}
                          className="border-0 border-b border-hairline bg-transparent py-1 text-sm outline-none"
                        />
                      ) : null}
                      {gallery.allowComments ? (
                        <input
                          value={current.comment}
                          placeholder="Note for the photographer"
                          onChange={(e) => void patch(current, { comment: e.target.value })}
                          className="border-0 border-b border-hairline bg-transparent py-1 text-sm outline-none"
                        />
                      ) : null}
                    </>
                  ) : null}
                  {gallery.allowDownload ? (
                    <a
                      href={current.preview}
                      download={current.name}
                      className="border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase hover:border-foreground"
                    >
                      Save
                    </a>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </main>
  );
}
