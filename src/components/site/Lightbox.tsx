import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Photo } from "@/data/portfolio";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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

  if (!mounted || !open) return null;
  const photo = photos[index];
  if (!photo) return null;

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

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
        <button
          type="button"
          aria-label="Previous image"
          onClick={() => step(-1)}
          className="absolute left-2 z-10 flex items-center justify-center text-foreground/60 transition-all duration-500 hover:-translate-x-1 hover:text-foreground md:left-8"
        >
          <ChevronLeft className="size-9" strokeWidth={1} />
        </button>

        <img
          key={photo.id}
          src={photo.src}
          alt={photo.caption}
          className="max-h-full max-w-full object-contain fade-up"
        />

        <button
          type="button"
          aria-label="Next image"
          onClick={() => step(1)}
          className="absolute right-2 z-10 flex items-center justify-center text-foreground/60 transition-all duration-500 hover:translate-x-1 hover:text-foreground md:right-8"
        >
          <ChevronRight className="size-9" strokeWidth={1} />
        </button>
      </div>

      <div className="shrink-0 px-6 pb-8 text-center">
        <p className="font-display text-xl">{photo.caption}</p>
        <p className="eyebrow mt-1">{photo.category}</p>
      </div>
    </div>,
    document.body,
  );
}
