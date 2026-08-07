import { useEffect, useRef, useState } from "react";
import { stats } from "@/data/portfolio";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

const SEEN_KEY = "shutterram-stats-counted";

function hasCounted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markCounted() {
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* private browsing — the count simply runs again next page */
  }
}

/**
 * A stat value like "250+", "1,200" or "12k" — the number inside grows from
 * zero the first time the strip scrolls into view, keeping any prefix,
 * suffix and thousands separators exactly as typed in the studio.
 */
export function StatValue({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const match = value.match(/^(\D*)([\d.,]+)(.*)$/);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!match) return;
    const digits = match[2]!;
    const target = Number(digits.replace(/,/g, ""));
    if (!Number.isFinite(target) || target <= 0) return;

    const grouped = digits.includes(",");
    const decimals = digits.includes(".") ? (digits.split(".")[1]?.length ?? 0) : 0;
    const render = (n: number) => {
      const fixed = n.toFixed(decimals);
      const body = grouped
        ? Number(fixed).toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        : fixed;
      return `${match[1]}${body}${match[3]}`;
    };

    if (hasCounted()) return;

    const node = ref.current;
    if (!node) return;
    setDisplay(render(0));

    let frame = 0;
    const run = () => {
      markCounted();
      const start = performance.now();
      const duration = 1400;
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(render(target * eased));
        if (p < 1) frame = requestAnimationFrame(tick);
        else setDisplay(value);
      };
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

export function StatsStrip({ className }: { className?: string }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-y-10 border-y border-hairline py-12 md:grid-cols-4",
        className,
      )}
    >
      {stats.map((s, i) => (
        <Reveal key={s.label} delay={i * 90} className="text-center">
          <dt className="font-display text-[clamp(2rem,4vw,3rem)] leading-none">
            <StatValue value={s.value} />
          </dt>
          <dd className="eyebrow mt-3">{s.label}</dd>
        </Reveal>
      ))}
    </dl>
  );
}
