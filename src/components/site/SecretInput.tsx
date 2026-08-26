import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Password input with a reveal (eye) toggle, styled like the site's line fields. */
export function SecretInput({
  value,
  onChange,
  required,
  minLength,
  autoComplete,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  id?: string;
}) {
  const [reveal, setReveal] = useState(false);
  return (
    <span className="relative mt-2 block">
      <input
        id={id ?? ""}
        type={reveal ? "text" : "password"}
        required={required ?? false}
        minLength={minLength ?? 0}
        autoComplete={autoComplete ?? ""}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-b border-hairline bg-transparent py-2 pr-9 text-sm outline-none transition-colors focus:border-foreground"
      />
      <button
        type="button"
        onClick={() => setReveal((v) => !v)}
        aria-label={reveal ? "Hide password" : "Show password"}
        title={reveal ? "Hide password" : "Show password"}
        className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        {reveal ? <EyeOff className="size-4" strokeWidth={1.4} /> : <Eye className="size-4" strokeWidth={1.4} />}
      </button>
    </span>
  );
}
