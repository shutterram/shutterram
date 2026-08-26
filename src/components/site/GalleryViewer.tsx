import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, Maximize2, Minimize2, X } from "lucide-react";
import { ImageLoader } from "./ImageLoader";

export interface ViewerImage {
  id: string;
  name: string;
  preview: string;
  orig?: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Full-screen photo viewer: swipe or arrow between photos, pinch/wheel zoom
 * with panning, and a floating download button while in full screen.
 */
export function GalleryViewer({
  images,
  index,
  onIndex,
  onClose,
  showFilenames,
  allowDownload,
  onDownload,
  footer,
}: {
  images: ViewerImage[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  showFilenames?: boolean;
  allowDownload?: boolean;
  onDownload?: (image: ViewerImage) => void;
  footer?: (image: ViewerImage) => ReactNode;
}) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [loaded, setLoaded] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const pan = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTap = useRef(0);

  const current = images[index];

  useEffect(() => {
    setLoaded(false);
  }, [index]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      setLoaded(true);
      return;
    }
    const onLoad = () => setLoaded(true);
    const onError = () => setLoaded(true);
    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
    return () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };
  }, [current?.id, current?.preview]);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    reset();
  }, [index, reset]);

  const go = useCallback(
    (delta: number) => {
      const next = clamp(index + delta, 0, images.length - 1);
      if (next !== index) {
        setDirection(delta > 0 ? "next" : "prev");
        onIndex(next);
      }
    },
    [index, images.length, onIndex],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else if (fullscreen) setFullscreen(false);
        else onClose();
      }
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "0") reset();
      if (e.key === "f" || e.key === "F") void toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen, go, onClose, reset]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setFullscreen(false);
      } else if (shellRef.current?.requestFullscreen) {
        await shellRef.current.requestFullscreen();
        setFullscreen(true);
      } else {
        // iPhone Safari does not expose the element Fullscreen API. The viewer
        // is already viewport-fixed, so keep an equivalent in-app full screen.
        setFullscreen((value) => !value);
      }
    } catch {
      setFullscreen((value) => !value);
    }
  }

  useEffect(() => {
    // Warm a window of neighbours around the current photo so left/right taps
    // feel instant. Forward images (in the direction of travel) are fetched
    // first; the window stays small enough for mobile Safari's image memory.
    const forward = direction === "next" ? 1 : -1;
    const order: number[] = [];
    for (let step = 1; step <= 5; step++) {
      order.push(index + step * forward, index - step * forward);
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    order.forEach((i, position) => {
      const neighbor = images[i];
      if (!neighbor) return;
      timers.push(
        setTimeout(() => {
          const preload = new Image();
          preload.decoding = "async";
          preload.fetchPriority = position < 2 ? "high" : "low";
          preload.src = neighbor.preview;
        }, position * 60),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [direction, images, index]);


  const zoomAt = useCallback(
    (nextZoom: number, clientX: number, clientY: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const px = clientX - rect.left - rect.width / 2;
      const py = clientY - rect.top - rect.height / 2;
      setZoom((z) => {
        const target = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
        const k = target / z;
        setOffset((o) =>
          target === 1
            ? { x: 0, y: 0 }
            : { x: px - (px - o.x) * k, y: py - (py - o.y) * k },
        );
        return target;
      });
    },
    [],
  );

  // Wheel zoom needs a non-passive listener, which React's onWheel is not.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      setZoom((z) => {
        const next = clamp(z * Math.exp(-dy * 0.0018), MIN_ZOOM, MAX_ZOOM);
        zoomAt(next, e.clientX, e.clientY);
        return z;
      });
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y), zoom };
      pan.current = null;
      swipe.current = null;
      return;
    }
    if (zoom > 1) pan.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    else swipe.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const next = pinch.current.zoom * (dist / pinch.current.dist);
      zoomAt(next, (a!.x + b!.x) / 2, (a!.y + b!.y) / 2);
      return;
    }
    if (pan.current) {
      setOffset({
        x: pan.current.ox + (e.clientX - pan.current.x),
        y: pan.current.oy + (e.clientY - pan.current.y),
      });
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pan.current) {
      pan.current = null;
      return;
    }
    const start = swipe.current;
    swipe.current = null;
    if (start && zoom === 1) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        go(dx < 0 ? 1 : -1);
        return;
      }
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        const now = Date.now();
        if (now - lastTap.current < 300) zoomAt(2.5, e.clientX, e.clientY);
        lastTap.current = now;
      }
    } else if (start && zoom > 1) {
      const now = Date.now();
      if (now - lastTap.current < 300) reset();
      lastTap.current = now;
    }
  }

  if (!current) return null;

  const body = (
    <div
      ref={shellRef}
      className="fixed inset-0 z-[100] h-[100dvh] w-screen overflow-hidden bg-background animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label={current.name}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-background/45 px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-5">
        <span className="eyebrow">
          {String(index + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
        </span>
        <div className="pointer-events-auto flex items-center gap-2">
          {zoom > 1 ? (
            <button
              type="button"
              onClick={reset}
              className="border border-hairline bg-background/70 px-3 py-2 text-[0.625rem] tracking-[0.2em] uppercase text-muted-foreground backdrop-blur hover:border-foreground hover:text-foreground"
            >
              Reset zoom
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            className="border border-hairline bg-background/70 p-2 text-muted-foreground backdrop-blur transition-colors hover:border-foreground hover:text-foreground"
          >
            {fullscreen ? (
              <Minimize2 className="size-4" strokeWidth={1.4} />
            ) : (
              <Maximize2 className="size-4" strokeWidth={1.4} />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center gap-2 border border-hairline bg-background/70 px-3 py-2 text-[0.625rem] tracking-[0.24em] uppercase text-muted-foreground backdrop-blur transition-colors hover:border-foreground hover:text-foreground"
          >
            <span className="hidden sm:inline">Close</span>
            <X className="size-4" strokeWidth={1.4} />
          </button>
        </div>
      </div>

      {allowDownload ? (
        <button
          type="button"
          onClick={() => onDownload?.(current)}
          aria-label="Download this photo"
          className="absolute right-4 top-20 z-20 inline-flex items-center gap-2 border border-hairline bg-background/70 px-3 py-2 text-[0.625rem] tracking-[0.2em] uppercase backdrop-blur hover:border-foreground"
        >
          <Download className="size-4" strokeWidth={1.4} />
          Save
        </button>
      ) : null}

      <div className="absolute inset-0 overflow-hidden">
        <button
          type="button"
          aria-label="Previous image"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="absolute left-3 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center bg-background/45 text-foreground/75 backdrop-blur-sm transition-all hover:-translate-x-1 hover:text-foreground disabled:opacity-20 sm:left-5 sm:size-12"
        >
          <ChevronLeft className="size-7 md:size-9" strokeWidth={1} />
        </button>

        <div
          ref={stageRef}
          className="absolute inset-0 overflow-hidden"
          style={{ touchAction: "none", cursor: zoom > 1 ? "grab" : "default" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {!loaded ? <ImageLoader label="Loading" /> : null}
          <img
            ref={imgRef}
            key={current.id}
            src={current.preview}
            alt={current.name}
            draggable={false}
            decoding="async"
            fetchPriority="high"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className={`absolute inset-0 h-full w-full object-contain transition-transform duration-100 will-change-transform ${
              direction === "next" ? "gallery-slide-next" : "gallery-slide-prev"
            }`}
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
          />
        </div>

        <button
          type="button"
          aria-label="Next image"
          onClick={() => go(1)}
          disabled={index === images.length - 1}
          className="absolute right-3 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center bg-background/45 text-foreground/75 backdrop-blur-sm transition-all hover:translate-x-1 hover:text-foreground disabled:opacity-20 sm:right-5 sm:size-12"
        >
          <ChevronRight className="size-7 md:size-9" strokeWidth={1} />
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-background/45 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm sm:px-6 sm:pb-6 sm:pt-4">
        {showFilenames ? (
          <p className="mb-3 text-center text-xs text-muted-foreground">{current.name}</p>
        ) : null}
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3">{footer?.(current)}</div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
