import { Star } from "lucide-react";
import { testimonials } from "@/data/portfolio";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

export function Testimonials({ className }: { className?: string }) {
  return (
    <section className={cn("border-t border-hairline bg-surface/30 py-24 md:py-32", className)}>
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="flex flex-col items-center">
          <SectionHeading
            eyebrow="Testimonials"
            title="What people say afterwards."
            intro="A few words from the couples, founders and teams I've photographed."
            align="center"
          />
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal key={t.id} delay={(i % 2) * 110}>
              <figure className="glow-hover flex h-full flex-col border border-hairline bg-background/40 p-8 transition-colors duration-700 hover:border-foreground/30 md:p-10">
                <div className="flex gap-1" aria-label={`${t.rating} out of 5`}>
                  {Array.from({ length: t.rating }).map((_, s) => (
                    <Star key={s} className="size-3.5 fill-foreground text-foreground" strokeWidth={0} />
                  ))}
                </div>
                <blockquote className="mt-6 font-display text-lg leading-relaxed md:text-xl">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-8 border-t border-hairline pt-5">
                  <p className="text-sm text-foreground">{t.name}</p>
                  <p className="eyebrow mt-1">{t.role}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
