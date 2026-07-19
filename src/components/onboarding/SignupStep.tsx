// Final onboarding step: create the account and save the plan.
// Email + password only — username stays whatever the DB trigger generated.

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PrimaryButton } from "./ui";

function friendlySignupError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists") || m.includes("already been"))
    return "That email already has an account — sign in instead and your plan will finish setting up.";
  if (m.includes("password")) return "Passwords need at least 6 characters.";
  if (m.includes("email")) return "That doesn't look like a valid email address.";
  return "Something went wrong creating your account. Please try again.";
}

export function SignupStep({
  onAccountReady,
}: {
  /** Called with the fresh uid+email once a session exists; writes plan + navigates. */
  onAccountReady: (uid: string, email: string | null) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifySentTo, setVerifySentTo] = useState<string | null>(null);

  const valid = /.+@.+\..+/.test(email.trim()) && password.length >= 6;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) {
        setError(friendlySignupError(signUpError.message));
        return;
      }
      if (data.session && data.user) {
        await onAccountReady(data.user.id, data.user.email ?? email.trim());
      } else {
        // Email confirmation is on — the draft stays local and completes after sign-in.
        setVerifySentTo(email.trim());
      }
    } catch {
      setError("We couldn't save your plan. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (verifySentTo) {
    return (
      <div className="flex flex-1 animate-fade-rise flex-col items-center justify-center py-10 text-center">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-primary-soft">
          <MailCheck className="h-10 w-10 text-primary" strokeWidth={1.75} />
        </div>
        <h1 className="mt-4 text-heading text-foreground">Confirm your email</h1>
        <p className="mt-1 max-w-xs text-body text-muted-foreground">
          We sent a link to {verifySentTo}. Tap it, then sign in — your plan is saved on this device
          and will finish setting up automatically.
        </p>
        <Link
          to="/auth"
          className="mt-5 flex h-12 items-center justify-center rounded-control px-6 text-[15px] font-semibold text-primary transition-transform duration-instant active:scale-[0.92]"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 animate-fade-rise flex-col justify-center py-10">
      <h1 className="text-title text-foreground">Save your plan</h1>
      <p className="mt-1 text-body text-secondary-text">
        Create your account to lock in your targets. Email and password — that's it.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="signup-email" className="text-label text-secondary-text">
            Email
          </Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-12 rounded-control bg-card text-body"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-password" className="text-label text-secondary-text">
            Password
          </Label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="h-12 rounded-control bg-card text-body"
          />
        </div>

        {error && (
          <div className="rounded-control bg-destructive-soft px-4 py-3">
            <p className="text-label text-destructive">{error}</p>
          </div>
        )}

        <PrimaryButton type="submit" disabled={!valid || busy}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving your plan…
            </>
          ) : (
            "Save my plan"
          )}
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center text-label text-muted-foreground">
        Already have an account?{" "}
        <Link to="/auth" className="font-semibold text-primary">
          Sign in
        </Link>
      </p>
    </div>
  );
}
