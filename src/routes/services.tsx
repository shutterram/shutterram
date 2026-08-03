import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { services } from "@/data/portfolio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services & Rates | Shutter Ram Photography" },
      {
        name: "description",
        content:
          "Wedding, corporate, portrait, headshot, event and product photography services from Shutter Ram, with what's included and starting rates.",
      },
      { property: "og:title", content: "Services & Rates | Shutter Ram" },
      {
        property: "og:description",
        content: "Photography services from Shutter Ram — coverage, deliverables and starting rates.",
      },
      { property: "og:image", content: services[0]!.image },
      { name: "twitter:image", content: services[0]!.image },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  return (
    <div className="pb-28 pt-40">
      <div className="mx-auto max-w-7xl px-6">
        <p className="eyebrow">Services</p>
        <h1 className="mt-4 font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-tight">
          How we can work together
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Six ways I usually work, though nothing here is rigid. If your project sits
          somewhere between two of these, tell me about it — most of my favourite work
          started that way.
        </p>
      </div>

      <div className="mx-auto mt-20 max-w-7xl space-y-24 px-6 md:space-y-32">
        {services.map((s, i) => (
          <section
            key={s.slug}
            id={s.slug}
            className="grid scroll-mt-40 items-center gap-12 md:grid-cols-2"
          >
            <div className={cn("overflow-hidden", i % 2 === 1 && "md:order-2")}>
              <img
                src={s.image}
                alt={s.title}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover grayscale-[35%] transition-all duration-[1400ms] hover:grayscale-0"
              />
            </div>

            <div className={cn(i % 2 === 1 && "md:order-1")}>
              <p className="eyebrow">
                {String(i + 1).padStart(2, "0")} — {s.subtitle}
              </p>
              <h2 className="mt-4 font-display text-[clamp(1.85rem,3.5vw,3rem)] leading-tight">
                {s.title}
              </h2>
              <p className="mt-5 text-sm leading-loose text-muted-foreground md:text-base">
                {s.description}
              </p>

              <ul className="mt-7 space-y-2.5">
                {s.includes.map((inc) => (
                  <li key={inc} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-foreground" strokeWidth={1.4} />
                    {inc}
                  </li>
                ))}
              </ul>

              <p className="eyebrow mt-7 text-foreground">{s.from}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/gallery/$category"
                  params={{ category: s.category }}
                  className="inline-flex items-center border border-hairline px-6 py-3 text-[0.6875rem] tracking-[0.24em] uppercase transition-colors hover:border-foreground"
                >
                  View More
                </Link>
                <Link
                  to="/contact"
                  search={{ service: s.slug }}
                  hash="quote"
                  className="inline-flex items-center border border-foreground bg-foreground px-6 py-3 text-[0.6875rem] tracking-[0.24em] uppercase text-background transition-opacity hover:opacity-85"
                >
                  Request a Quote
                </Link>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
