import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Btn } from "@/components/crm/ui";

const PREF_KEY = "crm:email:recipients";

type Prefs = { client: boolean; me: boolean };

function readPrefs(): Prefs {
  if (typeof window === "undefined") return { client: true, me: true };
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (!raw) return { client: true, me: true };
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { client: parsed.client !== false, me: parsed.me !== false };
  } catch {
    return { client: true, me: true };
  }
}

/** Studio's own address, used for the "copy to me" recipient. */
export function useStudioEmail() {
  const [email, setEmail] = useState("");
  useEffect(() => {
    void supabase
      .from("settings")
      .select("email")
      .limit(1)
      .then(({ data }) => setEmail(String((data ?? [])[0]?.email ?? "")));
  }, []);
  return email;
}

function Check({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 text-sm ${disabled ? "opacity-50" : "cursor-pointer"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-3.5 accent-current"
      />
      <span>
        {label}
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
    </label>
  );
}

/**
 * Shared "send this by email" control for the CRM. Every send can go to the
 * client, to the studio, or both — the choice is remembered across the CRM.
 */
export function EmailButton({
  label = "Email",
  subject,
  body,
  clientEmail,
  clientName,
}: {
  label?: string;
  subject: string;
  body: string;
  clientEmail?: string | undefined;
  clientName?: string | undefined;
}) {
  const studioEmail = useStudioEmail();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ client: true, me: true });

  useEffect(() => setPrefs(readPrefs()), []);

  function update(patch: Partial<Prefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function send() {
    const to: string[] = [];
    if (prefs.client && clientEmail) to.push(clientEmail);
    if (prefs.me && studioEmail) to.push(studioEmail);
    if (to.length === 0) {
      toast.error("Pick at least one recipient with an email address on file.");
      return;
    }
    const greeting = clientName ? `Hi ${clientName},\n\n` : "";
    window.location.href = `mailto:${to.join(",")}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(greeting + body)}`;
    setOpen(false);
  }

  return (
    <span className="relative inline-block">
      <Btn onClick={() => setOpen((v) => !v)}>{label}</Btn>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-72 space-y-4 border border-hairline bg-background p-4 shadow-lg">
          <p className="text-[0.625rem] tracking-[0.22em] uppercase text-muted-foreground">
            Send to
          </p>
          <Check
            checked={prefs.client && Boolean(clientEmail)}
            disabled={!clientEmail}
            onChange={(v) => update({ client: v })}
            label="Client"
            hint={clientEmail || "No email on this contact"}
          />
          <Check
            checked={prefs.me && Boolean(studioEmail)}
            disabled={!studioEmail}
            onChange={(v) => update({ me: v })}
            label="Me (studio)"
            hint={studioEmail || "Add a studio email in the content studio"}
          />
          <div className="flex gap-2">
            <Btn variant="solid" onClick={send}>
              Open email
            </Btn>
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
          </div>
        </div>
      ) : null}
    </span>
  );
}
