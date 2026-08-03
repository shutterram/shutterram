import logo from "@/assets/SRLogo.svg.asset.json";
import { site } from "@/data/portfolio";
import { cn } from "@/lib/utils";

/**
 * Stacked brand lockup: logo mark on top, wordmark beneath, tagline last.
 */
export function LogoLockup({
  size = "md",
  className,
  showTagline = true,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  showTagline?: boolean;
}) {
  const logoSize = size === "sm" ? "h-10" : size === "lg" ? "h-20" : "h-16";
  const nameSize = size === "sm" ? "text-base" : size === "lg" ? "text-3xl" : "text-2xl";

  return (
    <span className={cn("flex flex-col items-center", className)}>
      <img
        src={logo.url}
        alt=""
        aria-hidden="true"
        className={cn(
          "w-auto shrink-0 invert transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
          logoSize,
        )}
      />
      <span
        className={cn(
          "font-display mt-1 leading-none font-medium tracking-[0.14em] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
          nameSize,
        )}
      >
        SHUTTER RAM
      </span>
      {showTagline ? <span className="eyebrow mt-2">{site.tagline}</span> : null}
    </span>
  );
}
