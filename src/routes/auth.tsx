import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Studio Sign In | Shutter Ram" },
      { name: "description", content: "Private sign in for the Shutter Ram studio admin panel." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Studio Sign In | Shutter Ram" },
      { property: "og:description", content: "Private sign in for the Shutter Ram admin panel." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice("Check your email for a link to set a new password.");
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Check your email to confirm your account, then sign in.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/admin", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign you in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 pb-24 pt-20">
      <p className="eyebrow">Studio</p>
      <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3rem)] leading-tight">
        {mode === "signin"
          ? "Sign in"
          : mode === "signup"
            ? "Create your account"
            : "Reset password"}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {mode === "reset"
          ? "Enter your studio email and we'll send you a link to set a new password."
          : "This area is private — it is where the website content is managed."}
      </p>

      <form onSubmit={onSubmit} className="mt-10 space-y-8">
        <label className="block">
          <span className="eyebrow">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground"
          />
        </label>
        {mode === "reset" ? null : (
          <label className="block">
            <span className="eyebrow">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground"
            />
          </label>
        )}

        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full border border-foreground bg-foreground px-6 py-3 text-[0.6875rem] tracking-[0.24em] uppercase text-background transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {busy
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Send reset link"}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
        <button
          type="button"
          onClick={() => {
            setNotice("");
            setMode(mode === "signup" ? "signin" : "signup");
          }}
          className="text-[0.6875rem] tracking-[0.24em] uppercase text-muted-foreground transition-colors hover:text-foreground"
        >
          {mode === "signup" ? "Already have an account?" : "Need an account?"}
        </button>
        <button
          type="button"
          onClick={() => {
            setNotice("");
            setMode(mode === "reset" ? "signin" : "reset");
          }}
          className="text-[0.6875rem] tracking-[0.24em] uppercase text-muted-foreground transition-colors hover:text-foreground"
        >
          {mode === "reset" ? "Back to sign in" : "Forgot password?"}
        </button>
      </div>

      <Link
        to="/"
        className="mt-10 text-[0.6875rem] tracking-[0.24em] uppercase text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to site
      </Link>
    </div>
  );
}
