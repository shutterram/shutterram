import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border border-hairline bg-background p-5 ${className}`}>{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card>
      <p className="text-[0.625rem] tracking-[0.24em] uppercase text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-3xl leading-none">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

export function Btn({
  children,
  onClick,
  type = "button",
  variant = "ghost",
  disabled,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "ghost" | "solid" | "danger";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const base =
    "border px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors disabled:opacity-40";
  const styles =
    variant === "solid"
      ? "border-foreground bg-foreground text-background hover:opacity-90"
      : variant === "danger"
        ? "border-hairline text-muted-foreground hover:border-destructive hover:text-destructive"
        : "border-hairline hover:border-foreground";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="block text-[0.625rem] tracking-[0.22em] uppercase text-muted-foreground">
      {children}
    </span>
  );
}

const inputClass =
  "w-full border-0 border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground";

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        placeholder={placeholder ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}

export function AreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} resize-y`}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-current"
      />
      {label}
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="border border-dashed border-hairline p-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function copyLink(url: string, onDone: (msg: string) => void) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    void navigator.clipboard.writeText(url).then(() => onDone("Link copied"));
  }
}
