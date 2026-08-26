import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Star, X } from "lucide-react";
import { toast } from "sonner";
import {
  openGallery,
  galleryMeta,
  saveGalleryPick,
  setGalleryClientPassword,
  submitGallery,
  unlockGalleryPicking,
} from "@/lib/gallery.functions";
import type { PublicGallery, PublicGalleryImage } from "@/lib/gallery.server";
import { Btn, Card, Label, SelectField, TextField } from "@/components/crm/ui";
import { GalleryViewer } from "@/components/site/GalleryViewer";
import { ScrollRail } from "@/components/site/ScrollRail";
import { downloadMany, downloadOne } from "@/lib/download";
import { SITE_URL } from "@/lib/seo";

type GalleryColumns = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

interface RememberedGalleryState {
  code?: string;
  password?: string;
  pin?: string;
  editing?: boolean;
  passwordChoiceMade?: boolean;
  selected?: string[];
}

const GRID_CLASS: Record<GalleryColumns, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-2",
  "3": "grid-cols-3",
  "4": "grid-cols-4",
  "5": "grid-cols-5",
  "6": "grid-cols-6",
  "7": "grid-cols-7",
  "8": "grid-cols-8",
};

const asCols = (v: string | undefined): GalleryColumns =>
  v && /^[1-8]$/.test(v) ? (v as GalleryColumns) : "2";

export const Route = createFileRoute("/g/$token")({
  loader: ({ params }) => galleryMeta({ data: { token: params.token } }),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.title ?? "Your gallery | Shutter Ram" },
      { name: "description", content: loaderData?.description ?? "Private client gallery." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: loaderData?.title ?? "Your gallery | Shutter Ram" },
      { property: "og:description", content: loaderData?.description ?? "Private client gallery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: loaderData?.ogImage ? "summary_large_image" : "summary" },
      ...(loaderData?.ogImage
        ? [
            { property: "og:image", content: `${SITE_URL}${loaderData.ogImage}` },
            { name: "twitter:image", content: `${SITE_URL}${loaderData.ogImage}` },
          ]
        : []),
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
  const unlockPicking = useServerFn(unlockGalleryPicking);

  const [gallery, setGallery] = useState<PublicGallery | null>(null);
  const [gate, setGate] = useState<{ need: string; reason: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPasswordValue] = useState("");
  const [images, setImages] = useState<PublicGalleryImage[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [onlyPicked, setOnlyPicked] = useState(false);
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [askPassword, setAskPassword] = useState(false);
  const [askedOnce, setAskedOnce] = useState(false);
  const [sort, setSort] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [cols, setCols] = useState<GalleryColumns | null>(null);
  const [pin, setPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState("");
  const [sessionThumbs, setSessionThumbs] = useState<Map<string, string>>(new Map());
  const pressTimer = useRef<number | null>(null);
  const restoredRef = useRef(false);
  const sessionThumbUrls = useRef<string[]>([]);
  const storageKey = `shutterram:gallery:${token}`;

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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || lightbox !== null) return;
      if (confirming) setConfirming(false);
      else if (pinOpen) setPinOpen(false);
      else if (passwordOpen || askPassword) {
        setPasswordOpen(false);
        setAskPassword(false);
      } else if (selectMode) {
        setSelectMode(false);
        setSelected(new Set());
      } else if (editing) setEditing(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [askPassword, confirming, editing, lightbox, passwordOpen, pinOpen, selectMode]);

  async function load(
    credentials?: { code?: string; password?: string },
    passwordChoiceMade = askedOnce,
  ) {
    try {
      const activeCode = credentials?.code ?? code;
      const activePassword = credentials?.password ?? password;
      const res = await open({ data: { token, code: activeCode, password: activePassword } });
      if (res.ok) {
        setGallery(res);
        setImages(res.images);
        setGate(null);
        // Offer a private password right away instead of burying it below the photos.
        if (res.allowClientPassword && !res.hasClientPassword && !passwordChoiceMade) {
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
    let remembered: RememberedGalleryState = {};
    try {
      remembered = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as RememberedGalleryState;
    } catch {
      remembered = {};
    }
    const savedCode = remembered.code ?? "";
    const savedPassword = remembered.password ?? "";
    const savedPin = remembered.pin ?? "";
    setCode(savedCode);
    setPasswordValue(savedPassword);
    setPin(savedPin);
    setEditing(Boolean(remembered.editing));
    setAskedOnce(Boolean(remembered.passwordChoiceMade));
    setSelected(new Set(remembered.selected ?? []));

    void (async () => {
      if (savedPin) {
        const result = await unlockPicking({ data: { token, pin: savedPin } });
        if (result.ok) setPinUnlocked(true);
        else setPin("");
      }
      await load({ code: savedCode, password: savedPassword }, Boolean(remembered.passwordChoiceMade));
      restoredRef.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!restoredRef.current) return;
    const state: RememberedGalleryState = {
      code,
      password,
      pin: pinUnlocked ? pin : "",
      editing,
      passwordChoiceMade: askedOnce,
      selected: Array.from(selected),
    };
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [askedOnce, code, editing, password, pin, pinUnlocked, selected, storageKey]);

  const thumbnailSet = images.map((image) => `${image.id}:${image.thumb}`).join("|");

  useEffect(() => {
    if (!gallery || images.length === 0) return;

    const controller = new AbortController();
    const entries = images.map((image) => ({ id: image.id, src: image.thumb }));
    const retained = new Map<string, string>();
    let cursor = 0;

    // Fetch every small grid derivative rather than delegating loading to the
    // viewport. Blob URLs retain the downloaded bytes for this page session,
    // so Safari can discard a decoded bitmap without making another request.
    async function worker() {
      while (!controller.signal.aborted) {
        const entry = entries[cursor++];
        if (!entry) return;
        try {
          const response = await fetch(entry.src, {
            cache: "force-cache",
            signal: controller.signal,
          });
          if (!response.ok) continue;
          const objectUrl = URL.createObjectURL(await response.blob());
          retained.set(entry.id, objectUrl);
          sessionThumbUrls.current.push(objectUrl);
          setSessionThumbs(new Map(retained));
        } catch (error) {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            // Keep the original signed URL as a graceful fallback.
          }
        }
      }
    }

    setSessionThumbs(new Map());
    void Promise.all(Array.from({ length: Math.min(8, entries.length) }, () => worker()));

    return () => {
      controller.abort();
      for (const objectUrl of sessionThumbUrls.current) URL.revokeObjectURL(objectUrl);
      sessionThumbUrls.current = [];
    };
    // Pick/rating updates preserve this signature and therefore do not reload thumbnails.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery?.id, thumbnailSet]);

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
  const pinLocked = isCull && gallery.requiresPickPin && !pinUnlocked;
  const locked = isCull && (pinLocked || !editing);
  const gridDefault = asCols(
    device === "mobile"
      ? gallery.gridMobile
      : device === "tablet"
        ? gallery.gridTablet
        : gallery.gridDesktop,
  );
  const columns = cols ?? gridDefault;
  const activeSort = sort ?? gallery.defaultSort;
  let base = images;
  if (onlyPicked) base = base.filter((i) => i.picked);
  if (onlyStarred) base = base.filter((i) => i.starred);
  const shown = [...base];
  if (activeSort === "name") shown.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (activeSort === "name-desc") shown.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
  if (activeSort === "picked") shown.sort((a, b) => Number(b.picked) - Number(a.picked));

  async function patch(image: PublicGalleryImage, patchValue: Partial<PublicGalleryImage>) {
    const changesPicks =
      patchValue.picked !== undefined ||
      patchValue.rating !== undefined ||
      patchValue.label !== undefined ||
      patchValue.comment !== undefined;
    if (pinLocked && changesPicks) {
      setPinOpen(true);
      return;
    }
    if (locked && changesPicks) {
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
        pin,
        imageId: image.id,
        ...(patchValue.picked !== undefined ? { picked: patchValue.picked } : {}),
        ...(patchValue.starred !== undefined ? { starred: patchValue.starred } : {}),
        ...(patchValue.rating !== undefined ? { rating: patchValue.rating } : {}),
        ...(patchValue.label !== undefined ? { label: patchValue.label } : {}),
        ...(patchValue.comment !== undefined ? { comment: patchValue.comment } : {}),
      },
    });
    if (!res.ok) toast.error(res.reason ?? "Could not save your choice");
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startPress(id: string) {
    if (selectMode) return;
    pressTimer.current = window.setTimeout(() => {
      setSelectMode(true);
      setSelected(new Set([id]));
      pressTimer.current = null;
    }, 450);
  }

  function cancelPress() {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  async function downloadList(list: PublicGalleryImage[]) {
    if (!list.length) return;
    if (list.length === 1) {
      downloadOne(list[0]!.orig, list[0]!.name);
      return;
    }
    setDownloading(`Packing 0 of ${list.length}…`);
    try {
      await downloadMany(
        list.map((i) => ({ url: i.orig, name: i.name })),
        `${(gallery!.title || "photos").replace(/[^a-z0-9\-_ ]/gi, "").trim() || "photos"}.zip`,
        (done, total) => setDownloading(`Packing ${done} of ${total}…`),
      );
      toast.success("Download ready");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setDownloading("");
    }
  }

  const selectedImages = images.filter((i) => selected.has(i.id));

  function enterSelection() {
    if (pinLocked) setPinOpen(true);
    else setEditing(true);
  }

  async function patchSelected(patchValue: { picked?: boolean; starred?: boolean }) {
    const ids = new Set(selectedImages.map((image) => image.id));
    setImages((current) =>
      current.map((image) => (ids.has(image.id) ? { ...image, ...patchValue } : image)),
    );
    const results = await Promise.all(
      selectedImages.map((image) =>
        savePick({
          data: {
            token,
            code,
            password,
            pin,
            imageId: image.id,
            ...patchValue,
          },
        }),
      ),
    );
    if (results.some((result) => !result.ok)) {
      toast.error("Some changes could not be saved. Please try again.");
      void load();
    }
  }

  const clientMessage = gallery.showMessage ? gallery.message || gallery.welcome : "";

  return (
    <main className={`mx-auto px-6 pb-24 pt-56 ${Number(columns) > 4 ? "max-w-[96rem]" : "max-w-6xl"}`}>
      {gallery.cover ? (
        <figure className="mb-10 overflow-hidden">
          <img
            src={gallery.cover}
            alt={`${gallery.title} cover`}
            className="h-[38vh] min-h-64 w-full object-cover md:h-[52vh]"
            loading="eager"
            decoding="async"
          />
        </figure>
      ) : null}
      <p className="eyebrow">{isCull ? "Photo selection" : "Your gallery"}</p>
      <h1 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.75rem)]">{gallery.title}</h1>
      {clientMessage ? (
        <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {clientMessage}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <SelectField
            label="Sort"
            value={activeSort}
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
          </>
        ) : null}
        <Btn onClick={() => setOnlyStarred((v) => !v)}>
          {onlyStarred ? "Show all" : "Starred only"}
        </Btn>
        {isCull && !locked ? (
            <Btn variant="solid" onClick={() => setConfirming(true)}>
              {submitted ? "Update selection" : "Submit selection"}
            </Btn>
        ) : null}
        {gallery.allowDownload ? (
          <Btn onClick={() => void downloadList(shown)}>Download all</Btn>
        ) : null}
        {gallery.allowClientPassword ? (
          <Btn onClick={() => setPasswordOpen(true)}>
            {gallery.hasClientPassword ? "Change password" : "Set password"}
          </Btn>
        ) : null}
      </div>

      {isCull && locked ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Viewing only — use Select images when you’re ready to make or update your choices.
        </p>
      ) : null}

      {isCull && !locked ? (
        <p className="mt-3 text-xs text-foreground">
          {submitted
            ? "Editing your submitted selection — changes save immediately."
            : "Selection mode is active — changes save immediately."}
        </p>
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">
        Tip: press and hold a photo to select several at once.
      </p>

      <div className="mt-6 flex items-end justify-center gap-3">
        <label className="flex items-center gap-3">
          <span className="eyebrow">View</span>
          <select
            value={columns}
            onChange={(event) => setCols(event.target.value as GalleryColumns)}
            className="border-0 border-b border-hairline bg-transparent px-2 py-2 text-sm outline-none focus:border-foreground"
            aria-label="Gallery columns"
          >
            {Array.from({ length: 8 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1} column{index ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={`mt-10 grid gap-3 ${GRID_CLASS[columns]}`}>
        {shown.map((img, index) => {
          const isSelected = selected.has(img.id);
          return (
            <figure
              key={img.id}
              className={`gallery-grid-item group relative transition-shadow ${
                selectMode && isSelected
                  ? "ring-2 ring-foreground"
                  : isCull && !locked
                    ? img.picked
                      ? "ring-2 ring-foreground"
                      : "ring-1 ring-foreground/30 hover:ring-foreground/70"
                    : ""
              }`}
            >
              <button
                type="button"
                onClick={() => (selectMode ? toggleSelect(img.id) : setLightbox(index))}
                onPointerDown={() => startPress(img.id)}
                onPointerUp={cancelPress}
                onPointerLeave={cancelPress}
                onPointerCancel={cancelPress}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectMode(true);
                  toggleSelect(img.id);
                }}
                className="block w-full"
                aria-label={`Open ${img.name}`}
              >
                <img
                  src={sessionThumbs.get(img.id) ?? img.thumb}
                  alt={img.name}
                  loading="eager"
                  decoding="async"
                  className="aspect-[4/5] w-full object-cover transition-opacity group-hover:opacity-90"
                />
              </button>
              {selectMode ? (
                <span
                  className={
                    "pointer-events-none absolute right-2 top-2 flex size-6 items-center justify-center border text-[0.6rem] " +
                    (isSelected
                      ? "border-foreground bg-foreground text-background"
                      : "border-white/70 bg-background/60")
                  }
                >
                  {isSelected ? "✓" : ""}
                </span>
              ) : null}
              {isCull && !selectMode ? (
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
              {img.starred ? (
                <Star
                  className="pointer-events-none absolute bottom-2 left-2 size-4 fill-current text-white drop-shadow"
                  strokeWidth={1.2}
                />
              ) : null}
              {gallery.allowDownload && !selectMode ? (
                <button
                  type="button"
                  onClick={() => downloadOne(img.orig, img.name)}
                  className="absolute right-0 top-0 bg-background/80 px-3 py-2 text-[0.55rem] tracking-[0.2em] uppercase"
                >
                  Save
                </button>
              ) : null}
              {gallery.showFilenames ? (
                <figcaption className="mt-1 truncate text-[0.65rem] text-muted-foreground">
                  {img.name}
                </figcaption>
              ) : null}
            </figure>
          );
        })}
      </div>

      <ScrollRail />

      {isCull && locked && mounted
        ? createPortal(
            <button
              type="button"
              onClick={enterSelection}
              className="fixed bottom-6 left-1/2 z-[75] -translate-x-1/2 border border-foreground bg-foreground px-6 py-3 text-[0.625rem] tracking-[0.2em] uppercase text-background shadow-lg"
            >
              {submitted ? "Edit selection" : "Select images"}
            </button>,
            document.body,
          )
        : null}

      {selectMode && mounted
        ? createPortal(
            <div className="fixed inset-x-0 bottom-0 z-[95] border-t border-hairline bg-background/95 px-4 py-3 backdrop-blur">
              <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-muted-foreground">{selected.size} selected</span>
                <Btn onClick={() => setSelected(new Set(shown.map((i) => i.id)))}>Select all</Btn>
                <Btn
                  onClick={() => {
                    void patchSelected({ starred: true });
                  }}
                >
                  Star
                </Btn>
                <Btn
                  onClick={() => {
                    void patchSelected({ starred: false });
                  }}
                >
                  Unstar
                </Btn>
                {isCull && !locked ? (
                  <Btn
                    onClick={() => {
                      void patchSelected({ picked: true });
                    }}
                  >
                    Pick
                  </Btn>
                ) : null}
                {gallery.allowDownload ? (
                  <Btn variant="solid" onClick={() => void downloadList(selectedImages)}>
                    Download
                  </Btn>
                ) : null}
                <Btn
                  onClick={() => {
                    setSelectMode(false);
                    setSelected(new Set());
                  }}
                >
                  <X className="mr-1 inline size-3" /> Exit
                </Btn>
              </div>
            </div>,
            document.body,
          )
        : null}

      {downloading && mounted
        ? createPortal(
            <div className="fixed bottom-6 left-1/2 z-[130] -translate-x-1/2 border border-hairline bg-background px-4 py-3 text-xs tracking-[0.18em] uppercase shadow-lg">
              {downloading} — keep this tab open
            </div>,
            document.body,
          )
        : null}

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
                      setAskedOnce(true);
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
                            setAskedOnce(true);
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

      {pinOpen && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[115] flex items-center justify-center bg-background/85 p-6 backdrop-blur-sm">
              <Card className="w-full max-w-sm">
                <Label>Selection PIN</Label>
                <p className="mt-3 text-sm text-muted-foreground">
                  Picking photos and leaving notes needs the private PIN the photographer shared
                  with you. Everyone else can still view the gallery.
                </p>
                <div className="mt-4">
                  <TextField label="PIN" type="password" value={pinInput} onChange={setPinInput} />
                </div>
                <div className="mt-6 flex gap-2">
                  <Btn onClick={() => setPinOpen(false)}>Cancel</Btn>
                  <Btn
                    variant="solid"
                    onClick={() => {
                      void unlockPicking({ data: { token, pin: pinInput } }).then((res) => {
                        if (res.ok) {
                          setPin(pinInput);
                          setPinUnlocked(true);
                          setEditing(true);
                          setPinOpen(false);
                          setPinInput("");
                          toast.success("Selection unlocked");
                        } else toast.error(res.reason ?? "That PIN is not right.");
                      });
                    }}
                  >
                    Unlock
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
                      void submit({ data: { token, code, password, pin } }).then((res) => {
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

      {lightbox !== null && mounted ? (
        <GalleryViewer
          images={shown}
          index={Math.min(lightbox, shown.length - 1)}
          onIndex={setLightbox}
          onClose={() => setLightbox(null)}
          showFilenames={gallery.showFilenames}
          allowDownload={gallery.allowDownload}
          onDownload={(img) => downloadOne(img.orig ?? img.preview, img.name)}
          footer={(viewed) => {
            const img = images.find((i) => i.id === viewed.id);
            if (!img) return null;
            return (
              <>
                {isCull ? (
                  <>
                    <Btn
                      variant={img.picked ? "solid" : "ghost"}
                      disabled={locked}
                      onClick={() => void patch(img, { picked: !img.picked })}
                    >
                      {img.picked ? "Picked" : "Pick this"}
                    </Btn>
                    {gallery.allowRating ? (
                      <div className="flex items-center gap-1 text-lg">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => void patch(img, { rating: n })}
                            className={n <= img.rating ? "text-foreground" : "text-muted-foreground"}
                            aria-label={`Rate ${n}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {gallery.allowLabels ? (
                      <input
                        value={img.label}
                        placeholder="Label"
                        onChange={(e) => void patch(img, { label: e.target.value })}
                        className="border-0 border-b border-hairline bg-transparent py-1 text-sm outline-none"
                      />
                    ) : null}
                    {gallery.allowComments ? (
                      <input
                        value={img.comment}
                        placeholder="Note for the photographer"
                        onChange={(e) => void patch(img, { comment: e.target.value })}
                        className="border-0 border-b border-hairline bg-transparent py-1 text-sm outline-none"
                      />
                    ) : null}
                  </>
                ) : null}
                <Btn
                  variant={img.starred ? "solid" : "ghost"}
                  onClick={() => void patch(img, { starred: !img.starred })}
                >
                  {img.starred ? "Starred" : "Star"}
                </Btn>
                {gallery.allowDownload ? (
                  <button
                    type="button"
                    onClick={() => downloadOne(img.orig, img.name)}
                    className="inline-flex items-center gap-2 border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase hover:border-foreground"
                  >
                    <Download className="size-4" strokeWidth={1.4} />
                    Save
                  </button>
                ) : null}
              </>
            );
          }}
        />
      ) : null}
    </main>
  );
}
