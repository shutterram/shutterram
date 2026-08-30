import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SecretInput } from "@/components/site/SecretInput";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password | Shutter Ram" },
      { name: "description", content: "Set a new password for the Shutter Ram studio account." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Reset Password | Shutter Ram" },
      {
        property: "og:description",
        content: "Set a new password for the Shutter Ram studio account.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery");
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session || isRecovery) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Both passwords must match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/admin", replace: true });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 pb-24 pt-20">
      <p className="eyebrow">Studio</p>
      <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3rem)] leading-tight">
        Set a new password
      </h1>

      {ready ? (
        <form onSubmit={onSubmit} className="mt-10 space-y-8">
          <label className="block">
            <span className="eyebrow">New password</span>
            <SecretInput required minLength={8} value={password} onChange={setPassword} />
          </label>
          <label className="block">
            <span className="eyebrow">Confirm password</span>
            <SecretInput required minLength={8} value={confirm} onChange={setConfirm} />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full border border-foreground bg-foreground px-6 py-3 text-[0.6875rem] tracking-[0.24em] uppercase text-background transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Update password"}
          </button>
        </form>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          Open this page from the reset link in your email. If the link has expired, request a new
          one from the sign-in page.
        </p>
      )}

      <Link
        to="/auth"
        className="mt-10 text-[0.6875rem] tracking-[0.24em] uppercase text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to sign in
      </Link>
    </div>
  );
}
