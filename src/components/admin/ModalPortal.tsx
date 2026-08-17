import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders overlay content on document.body so no animated/transformed ancestor
 * can trap the fixed layer partway down a long panel.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
