import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import type { RenderedPage } from "./PdfPages";

/**
 * Chrome/Acrobat-style PDF surface: zoom controls, fit-width, page counter and
 * scroll-spy paging. Overlays (form fields) are rendered per page by `children`.
 */
export function PdfViewer({
  pages,
  error,
  children,
  fileUrl,
  className = "",
  notice,
  onPageChange,
  onPageContextMenu,
}: {
  pages: RenderedPage[] | null;
  error?: string;
  fileUrl?: string;
  className?: string;
  notice?: ReactNode;
  children?: (page: RenderedPage) => ReactNode;
  onPageChange?: (page: number) => void;
  onPageContextMenu?: (
    page: number,
    xFraction: number,
    yFraction: number,
    event: ReactMouseEvent,
  ) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [current, setCurrent] = useState(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Track which page fills the viewport for the page counter.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !pages?.length) return;
    const onScroll = () => {
      const mid = root.scrollTop + root.clientHeight / 2;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-pdf-page]"));
      let found = 1;
      for (const n of nodes) {
        if (n.offsetTop <= mid) found = Number(n.dataset["pdfPage"] ?? 1);
      }
      setCurrent(found);
      onPageChange?.(found);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => root.removeEventListener("scroll", onScroll);
  }, [pages, onPageChange]);

  function goTo(index: number) {
    const root = scrollRef.current;
    const node = root?.querySelector<HTMLElement>(`[data-pdf-page="${index}"]`);
    if (!root || !node) return;
    root.scrollTo({ top: node.offsetTop - 12, behavior: "smooth" });
  }

  const total = pages?.length ?? 0;
  const btn =
    "flex size-8 items-center justify-center border border-hairline text-sm transition-colors hover:border-foreground disabled:opacity-30";

  return (
    <div className={`border border-hairline bg-muted/20 ${className}`}>
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-hairline bg-background/95 px-3 py-2 backdrop-blur">
        <button type="button" className={btn} onClick={() => goTo(Math.max(1, current - 1))} disabled={current <= 1} title="Previous page">
          ↑
        </button>
        <button type="button" className={btn} onClick={() => goTo(Math.min(total, current + 1))} disabled={current >= total} title="Next page">
          ↓
        </button>
        <span className="px-2 text-[0.625rem] tracking-[0.2em] uppercase text-muted-foreground">
          {total ? `${current} / ${total}` : "—"}
        </span>
        <span className="mx-1 h-5 w-px bg-hairline" />
        <button type="button" className={btn} onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))} title="Zoom out">
          −
        </button>
        <span className="w-12 text-center text-[0.625rem] tracking-[0.14em] text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" className={btn} onClick={() => setZoom((z) => Math.min(3, z + 0.15))} title="Zoom in">
          +
        </button>
        <button
          type="button"
          className="border border-hairline px-3 py-1.5 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground"
          onClick={() => setZoom(1)}
        >
          Fit width
        </button>
        {fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto border border-hairline px-3 py-1.5 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground"
          >
            Open / print
          </a>
        ) : null}
      </div>

      {notice ? (
        <div className="border-b border-hairline bg-background/80 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {notice}
        </div>
      ) : null}

      <div ref={scrollRef} className="max-h-[78vh] overflow-auto px-3 py-4">
        {error ? (
          <p className="p-6 text-sm text-muted-foreground">{error}</p>
        ) : pages === null ? (
          <p className="p-6 text-sm text-muted-foreground">Rendering document…</p>
        ) : (
          <div className="space-y-6">
            {pages.map((page) => (
              <div
                key={page.index}
                data-pdf-page={page.index}
                onContextMenu={(event) => {
                  if (!onPageContextMenu) return;
                  event.preventDefault();
                  const r = event.currentTarget.getBoundingClientRect();
                  onPageContextMenu(
                    page.index,
                    (event.clientX - r.left) / r.width,
                    (event.clientY - r.top) / r.height,
                    event,
                  );
                }}
                style={{ width: `${zoom * 100}%` }}
                className="relative mx-auto bg-white shadow-[0_2px_18px_rgba(0,0,0,0.35)]"
              >
                <img src={page.dataUrl} alt={`Page ${page.index}`} className="block w-full select-none" draggable={false} />
                {children?.(page)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
