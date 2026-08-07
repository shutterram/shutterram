import { Facebook, Instagram, Twitter, Camera } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { site } from "@/data/portfolio";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  flickr: Camera,
};

/**
 * Turns whatever was typed in the studio into a real absolute URL, so
 * "instagram.com/me", "www.instagram.com/me" and the full https:// form all
 * work. Anything already carrying a scheme (or mailto:/tel:) is left alone.
 */
export function normaliseHref(href: string): string {
  const value = href.trim();
  if (!value) return "#";
  if (/^(https?:|mailto:|tel:|\/)/i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

export function SocialLinks({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "lg";
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {site.socials.map((s) => {
        const Icon = icons[s.icon] ?? Camera;
        const glyph = size === "lg" ? "size-6" : "size-4";
        return (
          <a
            key={s.name}
            href={normaliseHref(s.href)}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={s.name}
            className={cn(
              "group flex items-center justify-center border border-hairline text-muted-foreground transition-colors duration-300 hover:border-foreground hover:text-foreground",
              size === "lg" ? "size-16" : "size-10",
            )}
          >
            {s.iconUrl ? (
              // Custom uploaded icon (SVG or PNG): masked so it always takes the
              // current text colour and the standard icon size.
              <span
                aria-hidden="true"
                className={cn(glyph, "bg-current")}
                style={{
                  WebkitMaskImage: `url("${s.iconUrl}")`,
                  maskImage: `url("${s.iconUrl}")`,
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                }}
              />
            ) : (
              <Icon className={glyph} strokeWidth={1.4} />
            )}
          </a>
        );
      })}
    </div>
  );
}
