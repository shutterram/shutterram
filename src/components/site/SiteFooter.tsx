import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { categories, site } from "@/data/portfolio";
import { SocialLinks } from "./SocialLinks";

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-surface/40">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-2xl tracking-[0.18em]">SHUTTER RAM</p>
          <p className="eyebrow mt-2">{site.tagline}</p>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
            A one-person studio photographing weddings, brands and people who would
            rather be remembered honestly than perfectly.
          </p>
          <SocialLinks className="mt-8" />
        </div>

        <div>
          <p className="eyebrow">Navigate</p>
          <ul className="mt-5 space-y-3 text-sm">
            {[
              { label: "Home", to: "/" as const },
              { label: "Gallery", to: "/gallery" as const },
              { label: "Services", to: "/services" as const },
              { label: "About Me", to: "/about" as const },
              { label: "Contact Me", to: "/contact" as const },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-muted-foreground transition-colors hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="eyebrow mt-8">Categories</p>
          <ul className="mt-5 space-y-3 text-sm">
            {categories.slice(0, 4).map((c) => (
              <li key={c.slug}>
                <Link
                  to="/gallery/$category"
                  params={{ category: c.slug }}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="eyebrow">Get in touch</p>
          <ul className="mt-5 space-y-4 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <Phone className="mt-0.5 size-4 shrink-0" strokeWidth={1.4} />
              <a href={`tel:${site.phone.replace(/[^+\d]/g, "")}`} className="transition-colors hover:text-foreground">
                {site.phone}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="mt-0.5 size-4 shrink-0" strokeWidth={1.4} />
              <a href={`mailto:${site.email}`} className="transition-colors hover:text-foreground">
                {site.email}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0" strokeWidth={1.4} />
              <span>{site.location}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Shutter Ram. All rights reserved.</p>
          <p className="tracking-[0.2em] uppercase">Every frame edited by hand</p>
        </div>
      </div>
    </footer>
  );
}
