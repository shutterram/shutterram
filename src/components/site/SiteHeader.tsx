import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { site } from "@/data/portfolio";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Home", to: "/" },
  { label: "Gallery", to: "/gallery" },
  { label: "Services", to: "/services" },
  { label: "About Me", to: "/about" },
  { label: "Contact Me", to: "/contact" },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-hairline bg-background/85 backdrop-blur-xl py-3"
          : "border-b border-transparent bg-transparent py-6",
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-6">
        <div className="flex w-full items-center justify-between md:justify-center">
          <Link to="/" className="group flex flex-col items-center" onClick={() => setOpen(false)}>
            <span
              className={cn(
                "font-display leading-none tracking-[0.18em] transition-all duration-500",
                scrolled ? "text-xl" : "text-2xl md:text-3xl",
              )}
            >
              SHUTTER RAM
            </span>
            <span
              className={cn(
                "eyebrow mt-1 hidden overflow-hidden transition-all duration-500 md:block",
                scrolled ? "max-h-0 opacity-0" : "max-h-6 opacity-100",
              )}
            >
              {site.tagline}
            </span>
          </Link>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden text-foreground"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        <nav className="hidden items-center gap-9 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="eyebrow relative py-1 transition-colors hover:text-foreground data-[status=active]:text-foreground"
            >
              <span className="relative after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-foreground after:transition-all after:duration-300 hover:after:w-full">
                {item.label}
              </span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 top-0 z-40 flex flex-col items-center justify-center gap-8 bg-background transition-all duration-400 md:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className="font-display text-3xl tracking-wide text-foreground"
          >
            {item.label}
          </Link>
        ))}
        <p className="eyebrow mt-6">{site.tagline}</p>
      </div>
    </header>
  );
}
