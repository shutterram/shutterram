import logo from "@/assets/SRLogo.svg.asset.json";
import { site } from "@/data/portfolio";
import { cn } from "@/lib/utils";

/**
 * Brand lockup: logo mark with the tagline beneath.
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
  const logoSize = size === "sm" ? "h-14" : size === "lg" ? "h-28" : "h-20";

  return (
    <span className={cn("flex flex-col items-center", className)}>
      <img
        src={logo.url}
        alt="Shutter Ram"
        className={cn(
          "w-auto shrink-0 invert transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
          logoSize,
        )}
      />
      {showTagline ? <span className="eyebrow mt-3">{site.tagline}</span> : null}
    </span>
  );
}
