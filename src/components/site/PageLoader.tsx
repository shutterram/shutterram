/** Full-screen loading state shown while a page's content is being fetched. */
export function PageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6">
      <div className="relative size-12">
        <span className="absolute inset-0 animate-ping border border-hairline" />
        <span className="absolute inset-0 border border-foreground/60" />
      </div>
      <p className="eyebrow animate-pulse">Loading</p>
    </div>
  );
}
