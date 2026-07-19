// /auth — returning-user sign in (email only; the old username-or-email RPC
// lookup is gone), forgot-password flow, and the #type=recovery handler for
// setting a new password from a reset link.

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Loader2, MailCheck, ScanLine } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PrimaryButton } from "@/components/onboarding/ui";

type Mode = "signin" | "forgot" | "sent" | "recovery";

function friendlySignInError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "That email and password don't match. Double-check them, or reset your password below.";
  if (m.includes("email not confirmed"))
    return "Your email isn't verified yet — check your inbox for the confirmation link.";
  if (m.includes("rate") || m.includes("too many"))
    return "Too many attempts — take a short breather and try again in a minute.";
  return "We couldn't sign you in. Please try again.";
}

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== "undefined" && window.location.hash.includes("type=recovery")
      ? "recovery"
      : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /.+@.+\..+/.test(email.trim());

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !emailValid || !password) return;
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (signInError) {
      setError(friendlySignInError(signInError.message));
      return;
    }
    navigate("/", { replace: true });
  };

  const sendReset = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !emailValid) return;
    setBusy(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    setBusy(false);
    if (resetError) {
      setError("We couldn't send the reset email. Check the address and try again.");
      return;
    }
    setMode("sent");
  };

  const setNewPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (newPassword.length < 6) {
      setError("Passwords need at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Those passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (updateError) {
      setError(
        "We couldn't update your password — the reset link may have expired. Request a new one below.",
      );
      return;
    }
    // Clear the recovery hash so a refresh doesn't reopen this form.
    window.history.replaceState(null, "", window.location.pathname);
    toast.success("Password updated. Welcome back.");
    navigate("/", { replace: true });
  };

  const errorBanner = error && (
    <div className="rounded-control bg-destructive-soft px-4 py-3">
      <p className="text-label text-destructive">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-8">
        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-primary-soft">
              <ScanLine className="h-6 w-6 text-primary" strokeWidth={1.75} />
            </div>
            <span className="font-display text-heading font-bold text-foreground">CalTrack</span>
          </div>

          {mode === "signin" && (
            <div className="animate-fade-rise rounded-card border border-border bg-card p-5 shadow-card">
              <h1 className="text-title text-foreground">Welcome back</h1>
              <p className="mt-1 text-body text-secondary-text">Use the email you signed up with.</p>

              <form onSubmit={signIn} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="auth-email" className="text-label text-secondary-text">
                    Email
                  </Label>
                  <Input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-12 rounded-control text-body"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-password" className="text-label text-secondary-text">
                    Password
                  </Label>
                  <Input
                    id="auth-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="h-12 rounded-control text-body"
                  />
                </div>

                {errorBanner}

                <PrimaryButton type="submit" disabled={busy || !emailValid || !password}>
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </PrimaryButton>
              </form>

              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                }}
                className="mt-4 flex h-11 w-full items-center justify-center rounded-control text-label font-semibold text-primary transition-transform duration-instant active:scale-[0.97]"
              >
                Forgot password?
              </button>
            </div>
          )}

          {mode === "forgot" && (
            <div className="animate-fade-rise rounded-card border border-border bg-card p-5 shadow-card">
              <h1 className="text-title text-foreground">Reset your password</h1>
              <p className="mt-1 text-body text-secondary-text">
                We'll email you a link to set a new one.
              </p>

              <form onSubmit={sendReset} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email" className="text-label text-secondary-text">
                    Email
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-12 rounded-control text-body"
                  />
                </div>

                {errorBanner}

                <PrimaryButton type="submit" disabled={busy || !emailValid}>
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </PrimaryButton>
              </form>

              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className="mt-4 flex h-11 w-full items-center justify-center rounded-control text-label font-semibold text-primary transition-transform duration-instant active:scale-[0.97]"
              >
                Back to sign in
              </button>
            </div>
          )}

          {mode === "sent" && (
            <div className="animate-fade-rise rounded-card border border-border bg-card p-5 text-center shadow-card">
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-primary-soft">
                <MailCheck className="h-10 w-10 text-primary" strokeWidth={1.75} />
              </div>
              <h1 className="mt-4 text-heading text-foreground">Check your inbox</h1>
              <p className="mt-1 text-body text-muted-foreground">
                We sent a password reset link to {email.trim()}. It can take a minute to arrive —
                check spam too.
              </p>
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="mt-5 flex h-11 w-full items-center justify-center rounded-control text-label font-semibold text-primary transition-transform duration-instant active:scale-[0.97]"
              >
                Back to sign in
              </button>
            </div>
          )}

          {mode === "recovery" && (
            <div className="animate-fade-rise rounded-card border border-border bg-card p-5 shadow-card">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft">
                <KeyRound className="h-6 w-6 text-primary" strokeWidth={1.75} />
              </div>
              <h1 className="mt-4 text-title text-foreground">Set a new password</h1>
              <p className="mt-1 text-body text-secondary-text">
                You're signed in from your reset link — pick a new password to finish.
              </p>

              <form onSubmit={setNewPasswordSubmit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-label text-secondary-text">
                    New password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="h-12 rounded-control text-body"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-label text-secondary-text">
                    Confirm password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Same one again"
                    className="h-12 rounded-control text-body"
                  />
                </div>

                {errorBanner}

                <PrimaryButton type="submit" disabled={busy || !newPassword || !confirmPassword}>
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    "Update password"
                  )}
                </PrimaryButton>
              </form>

              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                }}
                className="mt-4 flex h-11 w-full items-center justify-center rounded-control text-label font-semibold text-primary transition-transform duration-instant active:scale-[0.97]"
              >
                Request a new link
              </button>
            </div>
          )}

          {(mode === "signin" || mode === "forgot") && (
            <p className="mt-6 text-center text-label text-muted-foreground">
              New here?{" "}
              <Link to="/welcome" className="font-semibold text-primary">
                Build your plan
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
