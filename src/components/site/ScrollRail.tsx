import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A slim scrub rail pinned to the right edge. Dragging the handle scrolls the
 * page, which beats swiping through hundreds of photos on a phone.
 */
export function ScrollRail({ label = "" }: { label?: string }) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const progressRef = useRef(0);
  const frameRef = useRef(0);
  const dragFrameRef = useRef(0);
  const pendingYRef = useRef(0);
  const grabOffsetRef = useRef(0);
  const draggingRef = useRef(false);
  const previousScrollBehaviorRef = useRef("");
  
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible] = useState(false);

  const read = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      const scroller = document.scrollingElement || document.documentElement;
      const max = scroller.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progressRef.current = progress;
      
      if (handleRef.current && !draggingRef.current) {
        const rail = railRef.current;
        if (rail) {
          const handleHeight = handleRef.current.offsetHeight || 40;
          const usableHeight = Math.max(1, rail.clientHeight - handleHeight);
          const y = progress * usableHeight;
          handleRef.current.style.transform = `translate3d(-50%, ${y}px, 0)`;
        }
      }
      
      if (labelRef.current && !label) {
        labelRef.current.textContent = `${Math.round(progress * 100)}%`;
      }
      
      setVisible((current) => {
        const next = max > window.innerHeight * 0.6;
        return current === next ? current : next;
      });
    });
  }, [label]);

  useEffect(() => {
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    const observer = new ResizeObserver(read);
    observer.observe(document.body);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
      observer.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (dragFrameRef.current) cancelAnimationFrame(dragFrameRef.current);
    };
  }, [read]);

  const scrollToClient = useCallback((clientY: number) => {
    const rail = railRef.current;
    const handle = handleRef.current;
    if (!rail || !handle) return;
    
    const rect = rail.getBoundingClientRect();
    const handleHeight = handle.offsetHeight || 40;
    const usableHeight = Math.max(1, rect.height - handleHeight);
    
    // Calculate ratio based on where the pointer is relative to the rail, 
    // subtracting the initial grab offset so the handle doesn't "jump".
    let relativeY = clientY - rect.top - grabOffsetRef.current;
    const ratio = Math.min(1, Math.max(0, relativeY / usableHeight));
    
    progressRef.current = ratio;
    
    // Sync handle position immediately
    handle.style.transform = `translate3d(-50%, ${ratio * usableHeight}px, 0)`;
    
    if (labelRef.current && !label) {
      labelRef.current.textContent = `${Math.round(ratio * 100)}%`;
    }
    
    const scroller = document.scrollingElement || document.documentElement;
    const maxScroll = scroller.scrollHeight - window.innerHeight;
    scroller.scrollTop = ratio * maxScroll;
  }, [label]);

  const queueScroll = useCallback(
    (clientY: number) => {
      pendingYRef.current = clientY;
      if (dragFrameRef.current) return;
      dragFrameRef.current = requestAnimationFrame(() => {
        dragFrameRef.current = 0;
        scrollToClient(pendingYRef.current);
      });
    },
    [scrollToClient],
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      // Prevent browser scrolling while dragging the rail
      if (e.cancelable) e.preventDefault();
      queueScroll(e.clientY);
    };
    const up = () => {
      document.documentElement.style.scrollBehavior = previousScrollBehaviorRef.current;
      draggingRef.current = false;
      setDragging(false);
      read();
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging, queueScroll, read]);

  if (!visible) return null;

  return (
    <div
      ref={railRef}
      className="fixed right-1 top-[calc(env(safe-area-inset-top)+9rem)] bottom-6 z-[90] w-12 select-none sm:right-2 sm:top-40 sm:bottom-12"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        const handleRect = handleRef.current?.getBoundingClientRect();
        if (handleRect && e.clientY >= handleRect.top && e.clientY <= handleRect.bottom) {
          grabOffsetRef.current = e.clientY - handleRect.top;
        } else {
          // If tapping outside the handle, center it on the pointer
          grabOffsetRef.current = (handleRef.current?.offsetHeight || 40) / 2;
        }
        
        previousScrollBehaviorRef.current = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = "auto";
        draggingRef.current = true;
        setDragging(true);
        e.currentTarget.setPointerCapture?.(e.pointerId);
        scrollToClient(e.clientY);
      }}
      aria-hidden="true"
    >
      {/* Visual track */}
      <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-foreground/5" />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-hairline" />
      
      <div
        ref={handleRef}
        className="absolute left-1/2 top-0 flex items-center justify-center will-change-transform"
      >
        <span className={"flex h-10 w-6 flex-col items-center justify-center gap-[3.5px] border border-hairline bg-background/95 shadow-sm backdrop-blur transition-all duration-150 " + (dragging ? "scale-125 border-foreground/30 shadow-md" : "hover:border-foreground/20")}>
          <span className="h-px w-3 bg-foreground/40" />
          <span className="h-px w-3 bg-foreground/40" />
          <span className="h-px w-3 bg-foreground/40" />
        </span>
        {dragging ? (
          <span 
            ref={labelRef} 
            className="pointer-events-none absolute right-full mr-3 whitespace-nowrap border border-hairline bg-background px-2 py-1 text-[0.625rem] font-medium tracking-[0.18em] uppercase shadow-sm animate-in fade-in slide-in-from-right-1"
          >
            {label || `${Math.round(progressRef.current * 100)}%`}
          </span>
        ) : null}
      </div>
    </div>
  );
}
