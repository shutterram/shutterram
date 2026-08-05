import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Floating "back to top" control, revealed once the page has been scrolled. */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={
        "fixed bottom-6 right-6 z-40 grid size-11 place-items-center border border-hairline bg-background/70 text-foreground backdrop-blur-sm transition-all duration-500 hover:border-foreground " +
        (visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0")
      }
    >
      <ArrowUp className="size-4" />
    </button>
  );
}
