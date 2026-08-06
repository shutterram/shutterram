import { stats } from "@/data/portfolio";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

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
          <dt className="font-display text-[clamp(2rem,4vw,3rem)] leading-none">{s.value}</dt>
          <dd className="eyebrow mt-3">{s.label}</dd>
        </Reveal>
      ))}
    </dl>
  );
}
