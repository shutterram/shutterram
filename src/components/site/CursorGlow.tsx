import { useEffect, useRef, useState, type CSSProperties } from "react";
import { glow } from "@/data/portfolio";

/**
 * A soft light that follows the cursor across the site.
 * Only appears once a real mouse moves, and stays off for reduced-motion users.
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let x = 0;
    let y = 0;

    const paint = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.opacity = "1";
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      x = e.clientX;
      y = e.clientY;
      setEnabled(true);
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      if (ref.current) ref.current.style.opacity = "0";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  // Studio-controlled size, falloff and Photoshop-style blending mode.
  const style = {
    width: `${glow.size}px`,
    height: `${glow.size}px`,
    margin: `${-glow.size / 2}px 0 0 ${-glow.size / 2}px`,
    mixBlendMode: glow.blend,
    "--cursor-glow-stop": `${glow.softness}%`,
  } as CSSProperties;

  return <div ref={ref} className="cursor-glow" style={style} aria-hidden="true" />;
}
