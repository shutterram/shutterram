import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Photo } from "@/data/portfolio";
import { ImageLoader } from "./ImageLoader";

export function Lightbox({
  photos,
  index,
  onClose,
  onIndexChange,
}: {
  photos: Photo[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const open = index !== null;
  const photo = index !== null ? photos[index] : undefined;
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const touchRef = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);
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
  }, [photo?.id, photo?.src]);

  const step = useCallback(
    (dir: number) => {
      if (index === null || photos.length === 0) return;
      onIndexChange((index + dir + photos.length) % photos.length);
    },
    [index, photos.length, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, step, onClose]);

  useEffect(() => {
    // Warm the 5 photos on either side so arrow / swipe navigation is instant.
    if (!open || index === null || photos.length < 2) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const order: number[] = [];
    for (let s = 1; s <= 5; s++) order.push(index + s, index - s);
    order.forEach((i, position) => {
      const neighbor = photos[(i + photos.length * 6) % photos.length];
      if (!neighbor?.src) return;
      timers.push(
        setTimeout(() => {
          const preload = new Image();
          preload.decoding = "async";
          preload.fetchPriority = position < 2 ? "high" : "low";
          preload.src = neighbor.src;
        }, position * 60),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [open, index, photos]);

  if (!mounted || !open || !photo) return null;

  // Rendered in a portal on <body> so no transformed / will-change ancestor
  // can turn `position: fixed` into a document-relative box.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col bg-background/97 backdrop-blur-md animate-in fade-in duration-500"
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption}
    >
      <div className="flex shrink-0 items-center justify-between px-6 py-5">
        <span className="eyebrow">
          {String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="group inline-flex items-center gap-2 border border-hairline px-4 py-2 text-[0.6875rem] tracking-[0.24em] uppercase text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
        >
          Close
          <X className="size-4" strokeWidth={1.4} />
        </button>
      </div>

      <div
        className="relative grid min-h-0 flex-1 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] grid-rows-[minmax(0,1fr)] items-center gap-2 overflow-hidden px-3 pb-4 md:grid-cols-[4rem_minmax(0,1fr)_4rem] md:gap-4 md:px-8"
        onTouchStart={(e) => {
          touchRef.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchRef.current;
          const end = e.changedTouches[0]?.clientX ?? null;
          touchRef.current = null;
          if (start === null || end === null) return;
          const dx = end - start;
          if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
        }}
      >
        <button
          type="button"
          aria-label="Previous image"
          onClick={() => step(-1)}
          className="flex shrink-0 items-center justify-center text-foreground/70 transition-all duration-500 hover:-translate-x-1 hover:text-foreground"
        >
          <ChevronLeft className="size-7 md:size-9" strokeWidth={1} />
        </button>

        <div className="relative flex min-h-0 flex-col items-center justify-center">
          {!loaded ? <ImageLoader label="Loading" /> : null}
          <img
            ref={imgRef}
            key={photo.id}
            src={photo.src}
            alt={photo.caption}
            className="mx-auto h-full max-h-[62dvh] w-auto max-w-full object-contain fade-up md:max-h-full"
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        </div>

        <button
          type="button"
          aria-label="Next image"
          onClick={() => step(1)}
          className="flex shrink-0 items-center justify-center text-foreground/70 transition-all duration-500 hover:translate-x-1 hover:text-foreground"
        >
          <ChevronRight className="size-7 md:size-9" strokeWidth={1} />
        </button>
      </div>

      <div className="flex shrink-0 items-center justify-center gap-10 pb-2 md:hidden">
        <button
          type="button"
          aria-label="Previous image"
          onClick={() => step(-1)}
          className="flex items-center justify-center text-foreground/70 transition-transform duration-500 active:-translate-x-1"
        >
          <ChevronLeft className="size-8" strokeWidth={1} />
        </button>
        <span className="eyebrow">Swipe</span>
        <button
          type="button"
          aria-label="Next image"
          onClick={() => step(1)}
          className="flex items-center justify-center text-foreground/70 transition-transform duration-500 active:translate-x-1"
        >
          <ChevronRight className="size-8" strokeWidth={1} />
        </button>
      </div>

      <div className="shrink-0 px-6 pb-8 pt-4 text-center">
        <p className="font-display text-xl">{photo.caption}</p>
        <p className="eyebrow mt-1">{photo.category}</p>
      </div>
    </div>,
    document.body,
  );
}
