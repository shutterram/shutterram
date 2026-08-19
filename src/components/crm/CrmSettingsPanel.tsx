import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { crmSettingsGet, crmSettingsSave, type CrmRow } from "@/lib/crm.functions";
import { googleDisconnect, googleStatus, startGoogleConnect } from "@/lib/google-drive.functions";
import { AreaField, Btn, Card, CheckField, Label, SelectField, TextField } from "./ui";
import { DEFAULT_TIMEZONE, TIMEZONE_OPTIONS } from "@/lib/timezones";

export function CrmSettingsPanel() {
  const get = useServerFn(crmSettingsGet);
  const save = useServerFn(crmSettingsSave);
  const status = useServerFn(googleStatus);
  const connect = useServerFn(startGoogleConnect);
  const disconnect = useServerFn(googleDisconnect);

  const [row, setRow] = useState<CrmRow | null>(null);
  const [drive, setDrive] = useState<{ connected: boolean; email?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setRow((await get({ data: {} as never })) ?? {});
        setDrive((await status({ data: {} as never })) as { connected: boolean; email?: string });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load settings");
      }
    })();
  }, [get, status]);

  if (!row) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const set = (key: string, value: unknown) => setRow({ ...row, [key]: value as never });
  const str = (key: string) => String(row[key] ?? "");
  const num = (key: string) => Number(row[key] ?? 0);

  async function persist() {
    setBusy(true);
    try {
      const patch = { ...(row as CrmRow) };
      delete patch["id"];
      delete patch["updated_at"];
      await save({ data: { patch } });
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">CRM settings</h2>
        <Btn variant="solid" disabled={busy} onClick={() => void persist()}>
          {busy ? "Saving…" : "Save settings"}
        </Btn>
      </div>

      <Card>
        <Label>Google Drive</Label>
        <p className="mt-3 text-sm text-muted-foreground">
          {drive?.connected
            ? `Connected${drive.email ? ` as ${drive.email}` : ""}. Signed contracts and gallery files are filed into the folders below.`
            : "Sign in with Google once — the connection stays active and refreshes itself."}
        </p>
        <div className="mt-4 flex gap-2">
          <Btn
            onClick={() => {
              void connect({ data: { origin: window.location.origin } })
                .then((res) => {
                  window.location.href = (res as { url: string }).url;
                })
                .catch((error: unknown) =>
                  toast.error(error instanceof Error ? error.message : "Could not start sign-in"),
                );
            }}
          >
            {drive?.connected ? "Reconnect Google" : "Connect Google Drive"}
          </Btn>
          {drive?.connected ? (
            <Btn
              variant="danger"
              onClick={() => {
                void disconnect({ data: {} as never }).then(() => {
                  setDrive({ connected: false });
                  toast.success("Google Drive disconnected");
                });
              }}
            >
              Disconnect
            </Btn>
          ) : null}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <TextField
            label="Contracts folder ID"
            value={str("drive_contracts_folder_id")}
            onChange={(v) => set("drive_contracts_folder_id", v)}
          />
          <TextField
            label="Raw / selection folder ID"
            value={str("drive_raw_parent_folder_id")}
            onChange={(v) => set("drive_raw_parent_folder_id", v)}
          />
          <TextField
            label="Final gallery folder ID"
            value={str("drive_final_parent_folder_id")}
            onChange={(v) => set("drive_final_parent_folder_id", v)}
          />
        </div>
      </Card>

      <Card>
        <Label>Client galleries</Label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AreaField
            label="Welcome message"
            value={str("gallery_welcome")}
            onChange={(v) => set("gallery_welcome", v)}
          />
          <TextField
            label="Accent colour"
            value={str("gallery_accent")}
            onChange={(v) => set("gallery_accent", v)}
          />
          <TextField
            label="Preview size (px)"
            type="number"
            value={String(num("preview_max_px"))}
            onChange={(v) => set("preview_max_px", Number(v) || 0)}
          />
          <TextField
            label="Preview quality (1–100)"
            type="number"
            value={String(num("preview_quality"))}
            onChange={(v) => set("preview_quality", Number(v) || 0)}
          />
          <TextField
            label="Thumbnail size (px)"
            type="number"
            value={String(num("thumb_max_px"))}
            onChange={(v) => set("thumb_max_px", Number(v) || 0)}
          />
          <TextField
            label="Watermark text"
            value={str("watermark_text")}
            onChange={(v) => set("watermark_text", v)}
          />
          <TextField
            label="Watermark opacity (%)"
            type="number"
            value={String(num("watermark_opacity"))}
            onChange={(v) => set("watermark_opacity", Number(v) || 0)}
          />
          <TextField
            label="Watermark size (% of width)"
            type="number"
            value={String(num("watermark_size"))}
            onChange={(v) => set("watermark_size", Number(v) || 0)}
          />
          <CheckField
            label="Show filenames to clients"
            checked={Boolean(row["gallery_show_filenames"])}
            onChange={(v) => set("gallery_show_filenames", v)}
          />
          <CheckField
            label="Let clients star-rate photos"
            checked={Boolean(row["cull_allow_rating"])}
            onChange={(v) => set("cull_allow_rating", v)}
          />
          <CheckField
            label="Let clients label photos"
            checked={Boolean(row["cull_allow_labels"])}
            onChange={(v) => set("cull_allow_labels", v)}
          />
          <CheckField
            label="Let clients leave comments"
            checked={Boolean(row["cull_allow_comments"])}
            onChange={(v) => set("cull_allow_comments", v)}
          />
        </div>
      </Card>

      <Card>
        <Label>Invoicing & pipeline</Label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField
            label="Currency symbol"
            value={str("currency")}
            onChange={(v) => set("currency", v)}
          />
          <TextField
            label="Invoice prefix"
            value={str("invoice_prefix")}
            onChange={(v) => set("invoice_prefix", v)}
          />
          <TextField
            label="Next invoice number"
            type="number"
            value={String(num("invoice_next_number"))}
            onChange={(v) => set("invoice_next_number", Number(v) || 1)}
          />
          <TextField
            label="Pipeline stages (comma separated)"
            value={
              Array.isArray(row["pipeline_stages"]) ? (row["pipeline_stages"] as string[]).join(", ") : ""
            }
            onChange={(v) =>
              set(
                "pipeline_stages",
                v.split(",").map((s) => s.trim()).filter(Boolean),
              )
            }
          />
          <TextField
            label="Lead sources (comma separated)"
            value={Array.isArray(row["lead_sources"]) ? (row["lead_sources"] as string[]).join(", ") : ""}
            onChange={(v) =>
              set(
                "lead_sources",
                v.split(",").map((s) => s.trim()).filter(Boolean),
              )
            }
          />
          <SelectField
            label="Default contract time zone"
            value={str("contract_timezone") || DEFAULT_TIMEZONE}
            onChange={(v) => set("contract_timezone", v)}
            options={TIMEZONE_OPTIONS}
          />
          <TextField
            label="Default field text size (pt)"
            type="number"
            value={String(num("contract_field_font_size") || 11)}
            onChange={(v) => set("contract_field_font_size", Number(v) || 11)}
          />
          <TextField
            label="Default date text size (pt)"
            type="number"
            value={String(num("contract_date_font_size") || 11)}
            onChange={(v) => set("contract_date_font_size", Number(v) || 11)}
          />
          <AreaField
            label="Contract footer note"
            value={str("contract_footer_note")}
            onChange={(v) => set("contract_footer_note", v)}
          />

        </div>
      </Card>
    </div>
  );
}
