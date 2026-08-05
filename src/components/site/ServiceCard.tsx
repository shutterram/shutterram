import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { Service } from "@/data/portfolio";

export function ServiceCard({ service, index = 0 }: { service: Service; index?: number }) {
  return (
    <article className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden border border-hairline">
      <img
        src={service.image}
        alt={service.title}
        loading="lazy"
        className="absolute inset-0 -z-10 size-full object-cover transition-transform duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/10 transition-opacity duration-700 group-hover:from-background group-hover:via-background/80" />
      <div className="absolute inset-0 -z-10 bg-background/45 md:hidden" />

      {/* index rule */}
      <div className="absolute top-0 left-0 flex items-center gap-3 p-6">
        <span className="font-display text-sm tracking-[0.2em] text-foreground/70">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="h-px w-8 bg-foreground/40 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-14" />
      </div>

      <div className="p-6">
        <p className="eyebrow">{service.subtitle}</p>
        <h3 className="mt-2 font-display text-2xl leading-tight">{service.title}</h3>

        {/* description + actions slide open on hover, always visible on touch */}
        <div className="hidden grid-rows-[0fr] transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr] md:grid">
          <div className="overflow-hidden">
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {service.description}
            </p>
          </div>
        </div>


        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            to="/services"
            hash={service.slug}
            className="group/btn inline-flex items-center gap-2 border-b border-hairline pb-1.5 text-[0.6875rem] tracking-[0.24em] uppercase hover:border-foreground"
          >
            {t("btn.view_more")}
            <ArrowUpRight className="size-3.5 transition-transform duration-500 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </Link>
          <Link
            to="/contact"
            search={{ service: service.slug }}
            hash="quote"
            className="inline-flex items-center border border-foreground bg-foreground px-5 py-2.5 text-[0.6875rem] tracking-[0.24em] uppercase text-background hover:bg-transparent hover:text-foreground"
          >
            {t("btn.request_quote")}
          </Link>
        </div>
      </div>
    </article>
  );
}
