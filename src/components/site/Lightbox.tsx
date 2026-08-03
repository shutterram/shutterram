import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect } from "react";
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

  if (!open) return null;
  const photo = photos[index];
  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-background/97 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption}
    >
      <div className="flex items-center justify-between px-6 py-5">
        <span className="eyebrow">
          {String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-6" strokeWidth={1.4} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-4">
        <button
          type="button"
          aria-label="Previous image"
          onClick={() => step(-1)}
          className="absolute left-2 z-10 flex size-12 items-center justify-center border border-hairline bg-background/40 text-foreground transition-colors hover:bg-background md:left-8"
        >
          <ChevronLeft className="size-5" strokeWidth={1.4} />
        </button>

        <img
          key={photo.id}
          src={photo.src}
          alt={photo.caption}
          className="max-h-[78vh] max-w-full object-contain fade-up"
        />

        <button
          type="button"
          aria-label="Next image"
          onClick={() => step(1)}
          className="absolute right-2 z-10 flex size-12 items-center justify-center border border-hairline bg-background/40 text-foreground transition-colors hover:bg-background md:right-8"
        >
          <ChevronRight className="size-5" strokeWidth={1.4} />
        </button>
      </div>

      <div className="px-6 pb-8 text-center">
        <p className="font-display text-xl">{photo.caption}</p>
        <p className="eyebrow mt-1">{photo.category}</p>
      </div>
    </div>
  );
}
