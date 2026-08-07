import { useEffect, useState } from "react";
import { gridDefaults, showViewLabel, type GridDevice, type GridPage } from "@/data/portfolio";

export type ColumnCount = "1" | "2" | "3";

/** Masonry column classes (static so Tailwind keeps them). */
export const COLUMN_CLASS: Record<ColumnCount, string> = {
  "1": "columns-1",
  "2": "columns-2",
  "3": "columns-3",
};

/** Desktop-only variants, for grids that switch to masonry from md up. */
export const DESKTOP_COLUMN_CLASS: Record<ColumnCount, string> = {
  "1": "md:columns-1",
  "2": "md:columns-2",
  "3": "md:columns-3",
};

/** Phone grid variants, so the same choice applies on mobile. */
export const MOBILE_GRID_CLASS: Record<ColumnCount, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-2",
  "3": "grid-cols-3",
};

const VIEW_OPTIONS: { value: ColumnCount; cells: number; label: string }[] = [
  { value: "1", cells: 1, label: "One column" },
  { value: "2", cells: 2, label: "Two columns" },
  { value: "3", cells: 3, label: "Three columns" },
];

/** Shared state hook so every gallery defaults to the two-column view. */
export function useColumnView(initial: ColumnCount = "2") {
  return useState<ColumnCount>(initial);
}

function readDevice(): GridDevice {
  if (typeof window === "undefined") return "desktop";
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

/**
 * Column state that starts from the studio default for the current page and
 * device, and switches to the visitor's own choice as soon as they pick one.
 */
export function useGridView(page: GridPage) {
  const [device, setDevice] = useState<GridDevice | null>(null);
  const [choice, setChoice] = useState<ColumnCount | null>(null);

  useEffect(() => {
    const read = () => setDevice(readDevice());
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  // Until the browser has measured itself, both server and client render the
  // same neutral default so hydration stays in step.
  const fallback = device ? ((gridDefaults[page]?.[device] ?? "2") as ColumnCount) : "2";
  return [choice ?? fallback, setChoice as (v: ColumnCount) => void] as const;
}

function ViewGlyph({ cells }: { cells: number }) {
  return (
    <span className="flex h-4 w-4 gap-[2px]">
      {Array.from({ length: cells }).map((_, i) => (
        <span key={i} className="flex-1 border border-current" />
      ))}
    </span>
  );
}

/** Little box glyphs that let the visitor choose how many columns to see. */
export function ViewSelector({
  value,
  onChange,
  className = "",
}: {
  value: ColumnCount;
  onChange: (v: ColumnCount) => void;
  className?: string;
}) {
  return (
    <div className={`flex shrink-0 items-center gap-2 ${className}`}>
      {showViewLabel ? <span className="eyebrow hidden sm:inline">View</span> : null}
      {VIEW_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-label={o.label}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={
            "flex size-9 items-center justify-center border transition-colors " +
            (value === o.value
              ? "border-foreground text-foreground"
              : "border-hairline text-muted-foreground hover:border-foreground hover:text-foreground")
          }
        >
          <ViewGlyph cells={o.cells} />
        </button>
      ))}
    </div>
  );
}
