import { useCallback, useEffect, useRef, useState } from "react";

export function BeforeAfterSlider({
  before,
  after,
  alt,
}: {
  before: string;
  after: string;
  alt: string;
}) {
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const setFromClientX = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, next)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => setFromClientX(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, setFromClientX]);

  return (
    <div
      ref={ref}
      className="relative aspect-[16/10] w-full touch-none select-none overflow-hidden bg-surface"
      onPointerDown={(e) => {
        setDragging(true);
        setFromClientX(e.clientX);
      }}
    >
      {/* AFTER — the edited frame */}
      <img
        src={after}
        alt={`${alt} — edited`}
        className="absolute inset-0 size-full object-cover"
        draggable={false}
      />

      {/* BEFORE — the original capture, clipped by the handle */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <img
          src={before}
          alt={`${alt} — before editing`}
          className="absolute inset-0 size-full object-cover"
          draggable={false}
        />
      </div>

      <span className="pointer-events-none absolute left-4 top-4 border border-hairline bg-background/60 px-3 py-1 text-[0.625rem] tracking-[0.28em] uppercase backdrop-blur-sm">
        Before
      </span>
      <span className="pointer-events-none absolute right-4 top-4 border border-hairline bg-background/60 px-3 py-1 text-[0.625rem] tracking-[0.28em] uppercase backdrop-blur-sm">
        After
      </span>

      {/* Handle */}
      <div
        className="pointer-events-none absolute inset-y-0 z-10 w-px bg-foreground/80"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-foreground/70 bg-background/70 backdrop-blur-sm">
          <span className="text-xs tracking-widest text-foreground">‹ ›</span>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        aria-label="Drag to compare before and after"
        onChange={(e) => setPos(Number(e.target.value))}
        className="absolute inset-x-0 bottom-0 h-10 w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
