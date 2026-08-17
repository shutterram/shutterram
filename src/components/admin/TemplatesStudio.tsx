import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { Loader2, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { exportTemplate, importTemplate } from "@/lib/templates.functions";
import { TEMPLATE_SCOPES, scopeById } from "@/lib/template-scopes";
import { buildTemplateZip, readTemplateFile } from "@/lib/template-assets";

const GROUPS = ["Everything", "Panels", "Sections"] as const;

/** Download the current content as a template file, or load one back in. */
export function TemplatesStudio() {
  const runExport = useServerFn(exportTemplate);
  const runImport = useServerFn(importTemplate);
  const router = useRouter();

  const [scope, setScope] = useState("all");
  const [busy, setBusy] = useState<"" | "export" | "import">("");
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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
      a.download = `shutterram-${scope.replace(":", "-")}-${new Date()
        .toISOString()
        .slice(0, 10)}.zip`;
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

  const current = scopeById(scope);

  return (
    <div className="space-y-10 pb-10">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Save your wording, colours, photos and settings as a template file you can keep, share or
        load back later. Pick whether it covers the whole site, one panel, or a single section.
      </p>

      {GROUPS.map((group) => (
        <section key={group}>
          <p className="eyebrow">{group}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {TEMPLATE_SCOPES.filter((s) => s.group === group).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScope(s.id)}
                className={
                  "border px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors " +
                  (scope === s.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-hairline text-muted-foreground hover:border-foreground hover:text-foreground")
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>
      ))}

      <div className="border border-hairline p-6">
        <p className="eyebrow">Selected</p>
        <p className="mt-2 text-sm">{current?.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Covers: {(current?.tables ?? []).join(", ")}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void download()}
            disabled={busy !== ""}
            className="inline-flex items-center gap-2 border border-foreground bg-foreground px-6 py-3 text-[0.625rem] tracking-[0.24em] uppercase text-background transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {busy === "export" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Download className="size-3" />
            )}
            Download template
          </button>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy !== ""}
            className="inline-flex items-center gap-2 border border-hairline px-6 py-3 text-[0.625rem] tracking-[0.24em] uppercase transition-colors hover:border-foreground disabled:opacity-50"
          >
            {busy === "import" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Upload className="size-3" />
            )}
            Load template
          </button>
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

        {note ? <p className="mt-4 text-xs text-muted-foreground">{note}</p> : null}

        <p className="mt-5 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Loading a template replaces everything inside the selected scope. A snapshot of the
          current content is saved to the History panel first, so you can roll straight back. Downloads
          are .zip bundles that include the actual image files, so a template still works after
          photos are deleted — or when loaded into another site.
        </p>
      </div>
    </div>
  );
}
