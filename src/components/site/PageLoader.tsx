import logo from "@/assets/SRLogo.svg.asset.json";

/** Full-screen loading state shown while a page's content is being fetched. */
export function PageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6">
      <div className="relative flex size-40 items-center justify-center">
        {/* Static hairline ring */}
        <span className="absolute inset-0 rounded-full border border-hairline" />
        {/* Rotating arc around the logo */}
        <span className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-foreground/80 [animation-duration:1.4s]" />
        <img
          src={logo.url}
          alt="Shutter Ram"
          className="h-14 w-auto animate-pulse brightness-0 invert"
        />
      </div>
      <p className="eyebrow animate-pulse">Loading</p>
    </div>
  );
}
