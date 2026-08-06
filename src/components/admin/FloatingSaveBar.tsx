import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Save bar pinned to the bottom of the viewport. Rendered through a portal on
 * document.body so no animated/transformed ancestor can trap the fixed layer.
 */
export function FloatingSaveBar({
  onClick,
  saving,
  label = "Save changes",
}: {
  onClick: () => void;
  saving: boolean;
  label?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center px-6 pb-6">
      <div className="pointer-events-auto flex items-center gap-4 border border-hairline bg-background/95 px-5 py-3 shadow-lg backdrop-blur">
        <span className="text-[0.625rem] tracking-[0.2em] uppercase text-muted-foreground">
          Unsaved changes
        </span>
        <button
          type="button"
          onClick={onClick}
          disabled={saving}
          className="inline-flex items-center gap-2 border border-foreground bg-foreground px-5 py-2 text-[0.625rem] tracking-[0.2em] uppercase text-background disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-3 animate-spin" /> : null}
          {label}
        </button>
      </div>
    </div>,
    document.body,
  );
}
