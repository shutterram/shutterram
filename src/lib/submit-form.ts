import { site } from "@/data/portfolio";
import { forwardFormSubmission } from "@/lib/submit-form.functions";

export type SubmitResult = { ok: true; mode: "endpoint" | "mailto" } | { ok: false; error: string };

/**
 * Sends a form submission through a server function, which forwards it to the
 * third-party form service configured in the studio settings. The endpoint URL
 * stays server-side. If no endpoint is configured yet, we fall back to opening
 * a pre-filled email draft so nothing is ever lost.
 */
export async function submitForm(
  subject: string,
  values: Record<string, string>,
): Promise<SubmitResult> {
  try {
    const result = await forwardFormSubmission({ data: { subject, values } });
    if (result.delivered) return { ok: true, mode: "endpoint" };
    if (!result.ok) return { ok: false, error: result.error ?? "Could not send your message." };
  } catch {
    return { ok: false, error: "Could not reach the form service. Please try again." };
  }

  const body = Object.entries(values)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { ok: true, mode: "mailto" };
}
