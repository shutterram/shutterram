import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { Service } from "@/data/portfolio";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="group flex flex-col border border-hairline bg-surface/30">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
        <img
          src={service.image}
          alt={service.title}
          loading="lazy"
          className="size-full object-cover grayscale-[35%] transition-all duration-[1200ms] ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col p-7">
        <h3 className="font-display text-2xl">{service.title}</h3>
        <p className="eyebrow mt-2">{service.subtitle}</p>
        <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
          {service.description}
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            to="/services"
            hash={service.slug}
            className="group/btn inline-flex items-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-[0.6875rem] tracking-[0.24em] uppercase transition-colors hover:border-foreground"
          >
            View More
            <ArrowUpRight className="size-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </Link>
          <Link
            to="/contact"
            search={{ service: service.slug }}
            hash="quote"
            className="inline-flex items-center border border-foreground bg-foreground px-5 py-2.5 text-[0.6875rem] tracking-[0.24em] uppercase text-background transition-opacity hover:opacity-85"
          >
            Request a Quote
          </Link>
        </div>
      </div>
    </article>
  );
}
