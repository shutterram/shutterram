import { site } from "@/data/portfolio";

export type SubmitResult = { ok: true; mode: "endpoint" | "mailto" } | { ok: false; error: string };

/**
 * Sends a form submission to the third-party form service configured in
 * `site.formEndpoint` (Formspree / Basin / Getform / FormSubmit all accept
 * this shape). If no endpoint is configured yet, we fall back to opening a
 * pre-filled email draft so nothing is ever lost.
 */
export async function submitForm(
  subject: string,
  values: Record<string, string>,
): Promise<SubmitResult> {
  const payload = { _subject: subject, ...values };

  if (site.formEndpoint) {
    try {
      const res = await fetch(site.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return { ok: false, error: `Form service responded with ${res.status}` };
      return { ok: true, mode: "endpoint" };
    } catch {
      return { ok: false, error: "Could not reach the form service. Please try again." };
    }
  }

  const body = Object.entries(values)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { ok: true, mode: "mailto" };
}
