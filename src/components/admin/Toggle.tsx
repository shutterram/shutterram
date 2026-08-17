interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  /** "sm" for the compact rows inside image cards. */
  size?: "sm" | "md";
  /** Accessible name when the toggle has no adjacent text. */
  label?: string;
  className?: string;
}

/**
 * Studio switch — replaces every tick box in the Content Studio with a small
 * sliding toggle so on/off states read at a glance.
 */
export function Toggle({
  checked,
  onChange,
  disabled = false,
  size = "md",
  label,
  className = "",
}: ToggleProps) {
  const track = size === "sm" ? "h-4 w-7" : "h-5 w-9";
  const knob = size === "sm" ? "size-3" : "size-4";
  const shift = size === "sm" ? "translate-x-3" : "translate-x-4";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        // The switch often sits inside a <label>; without this the label
        // re-dispatches the click onto the button and the value flips twice.
        e.preventDefault();
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative inline-flex shrink-0 items-center rounded-full border transition-colors duration-200 disabled:opacity-50 ${track} ${
        checked ? "border-foreground bg-foreground" : "border-hairline bg-transparent"
      } ${className}`}
    >
      <span
        className={`pointer-events-none ml-[2px] rounded-full transition-transform duration-200 ${knob} ${
          checked ? `${shift} bg-background` : "translate-x-0 bg-muted-foreground"
        }`}
      />
    </button>
  );
}
