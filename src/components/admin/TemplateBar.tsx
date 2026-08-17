import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { Loader2, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { exportTemplate, importTemplate } from "@/lib/templates.functions";
import { scopeById } from "@/lib/template-scopes";
import { buildTemplateZip, readTemplateFile } from "@/lib/template-assets";

/**
 * Compact download / load template controls for a single panel or section.
 * Downloads bundle the image files alongside the content as a .zip.
 * Shows nothing when the given scope isn't a known template scope.
 */
export function TemplateBar({ scope, label }: { scope: string; label?: string }) {
  const runExport = useServerFn(exportTemplate);
  const runImport = useServerFn(importTemplate);
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "export" | "import">("");
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const known = scopeById(scope);
  if (!known) return null;

  const stamp = `shutterram-${scope.replace(":", "-")}-${new Date().toISOString().slice(0, 10)}`;

  async function download() {
    setBusy("export");
    try {
      const file = await runExport({ data: { scope } });
      const blob = await buildTemplateZip(file, (done, total) =>
        setNote(total ? `Packing images ${done}/${total}` : ""),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${stamp}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Template downloaded with its images");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build the template");
    }
    setNote("");
    setBusy("");
  }

  async function load(file: File) {
    setBusy("import");
    try {
      const parsed = await readTemplateFile(file, (done, total) =>
        setNote(total ? `Restoring images ${done}/${total}` : ""),
      );
      if (parsed.format !== "shutterram-template" || !parsed.data) {
        throw new Error("That file isn't a Shutter Ram template.");
      }
      await runImport({ data: { scope, data: parsed.data as never } });
      toast.success("Template loaded — a snapshot of the old content was saved in History");
      void router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load that template");
    }
    setNote("");
    setBusy("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label ? (
        <span className="mr-1 text-[0.625rem] tracking-[0.2em] uppercase text-muted-foreground">
          {label}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => void download()}
        disabled={busy !== ""}
        className="inline-flex items-center gap-2 border border-hairline px-3 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground disabled:opacity-50"
      >
        {busy === "export" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Download className="size-3" />
        )}
        Download
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy !== ""}
        className="inline-flex items-center gap-2 border border-hairline px-3 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground disabled:opacity-50"
      >
        {busy === "import" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Upload className="size-3" />
        )}
        Load
      </button>
      {note ? <span className="text-[0.625rem] text-muted-foreground">{note}</span> : null}
      <input
        ref={fileRef}
        type="file"
        accept=".zip,application/zip,application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void load(f);
        }}
      />
    </div>
  );
}
