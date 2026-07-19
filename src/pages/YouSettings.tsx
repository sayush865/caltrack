// /you/settings — account, units, notifications stub, data export, danger zone.
// Slim by design: ALL goal editing lives in /you/goals (Flow 6).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, Download, LogOut } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Shimmer, Surface } from "@/components/system";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/hooks/useProfile";
import { useUpdateProfile } from "@/hooks/useMutations";
import { useExportData } from "@/components/you/hooks";
import type { Units } from "@/lib/units";

export default function YouSettings() {
  const navigate = useNavigate();
  const profileQuery = useProfile();
  const updateProfile = useUpdateProfile();
  const exportData = useExportData();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const profile = profileQuery.data;
  const units: Units = profile?.units_preference === "imperial" ? "imperial" : "metric";

  const setUnits = (next: Units) => {
    if (next === units) return;
    updateProfile.mutate(
      { units_preference: next },
      { onSuccess: () => toast.success(next === "metric" ? "Showing kilograms." : "Showing pounds.") },
    );
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast("Signed out. See you soon.");
    navigate("/welcome", { replace: true });
  };

  const deleteAccount = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });
      if (error) throw error;
      toast("Your account and data have been deleted.");
      await supabase.auth.signOut();
      navigate("/welcome", { replace: true });
    } catch {
      toast.error("Couldn't delete your account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <PageHeader title="Settings" back />

      <main className="mx-auto max-w-md space-y-3 px-4">
        {profileQuery.isLoading ? (
          <div className="space-y-3">
            <Shimmer className="h-28 w-full rounded-card" />
            <Shimmer className="h-20 w-full rounded-card" />
            <Shimmer className="h-20 w-full rounded-card" />
            <Shimmer className="h-32 w-full rounded-card" />
          </div>
        ) : (
          <>
            {/* ── Account ───────────────────────────────── */}
            <Surface className="p-5">
              <h2 className="text-heading text-foreground">Account</h2>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-body text-secondary-text">Email</span>
                  <span className="truncate text-caption text-muted-foreground">{profile?.email ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-body text-secondary-text">Username</span>
                  <span className="truncate text-caption text-muted-foreground">{profile?.username ?? "—"}</span>
                </div>
              </div>
            </Surface>

            {/* ── Units ─────────────────────────────────── */}
            <Surface className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-body font-medium text-foreground">Units</p>
                  <p className="text-caption text-muted-foreground">Display only — your data is stored in metric.</p>
                </div>
                <div className="flex rounded-control border border-border p-0.5" role="group" aria-label="Units">
                  {(["metric", "imperial"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setUnits(opt)}
                      disabled={updateProfile.isPending}
                      className={`min-h-[44px] rounded-[10px] px-4 text-label transition-transform duration-instant active:scale-[0.92] ${
                        units === opt ? "bg-primary text-primary-foreground" : "text-secondary-text"
                      }`}
                    >
                      {opt === "metric" ? "kg" : "lb"}
                    </button>
                  ))}
                </div>
              </div>
            </Surface>

            {/* ── Notifications (stub) ──────────────────── */}
            <Surface className="flex items-center gap-3 p-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-muted">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-foreground">Meal reminders</p>
                <p className="text-caption text-muted-foreground">Reminders come with the PWA update.</p>
              </div>
              <Switch checked={false} disabled aria-label="Meal reminders (coming soon)" />
            </Surface>

            {/* ── Data export ───────────────────────────── */}
            <Surface className="p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-primary-soft">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium text-foreground">Export my data</p>
                  <p className="text-caption text-muted-foreground">
                    Meals, water, weight and exercise as a JSON file.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => exportData.mutate()}
                disabled={exportData.isPending}
                className="mt-4 flex h-11 w-full items-center justify-center rounded-control bg-primary-soft text-label text-primary transition-transform duration-instant active:scale-[0.92] disabled:opacity-50"
              >
                {exportData.isPending ? "Preparing export…" : "Download JSON"}
              </button>
            </Surface>

            {/* ── Sign out ──────────────────────────────── */}
            <Surface className="overflow-hidden">
              <button
                type="button"
                onClick={signOut}
                className="flex min-h-[56px] w-full items-center gap-3 px-5 text-left transition-transform duration-instant active:scale-[0.97]"
              >
                <LogOut className="h-5 w-5 text-secondary-text" />
                <span className="flex-1 text-body text-foreground">Sign out</span>
              </button>
            </Surface>

            {/* ── Danger zone ───────────────────────────── */}
            <Surface className="border-destructive/30 p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h2 className="text-heading text-destructive">Danger zone</h2>
              </div>
              <p className="mt-1 text-caption text-muted-foreground">
                Deleting your account permanently removes your profile and every log. This cannot be undone.
              </p>
              <button
                type="button"
                onClick={() => {
                  setConfirmText("");
                  setDeleteOpen(true);
                }}
                className="mt-4 flex h-11 w-full items-center justify-center rounded-control bg-destructive-soft text-label text-destructive transition-transform duration-instant active:scale-[0.92]"
              >
                Delete account
              </button>
            </Surface>
          </>
        )}
      </main>

      {/* ── Delete confirmation dialog ─────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <DialogContent className="rounded-card border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-title text-foreground">Delete your account?</DialogTitle>
            <DialogDescription className="text-body text-muted-foreground">
              Every meal, weigh-in and insight will be permanently erased. Type{" "}
              <span className="font-medium text-foreground">DELETE</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
            aria-label="Type DELETE to confirm"
            className="rounded-control tabular-nums"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="flex h-11 flex-1 items-center justify-center rounded-control border border-border bg-card text-label text-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-50"
            >
              Keep my account
            </button>
            <button
              type="button"
              onClick={deleteAccount}
              disabled={confirmText !== "DELETE" || deleting}
              className="flex h-11 flex-1 items-center justify-center rounded-control bg-destructive text-label text-destructive-foreground transition-transform duration-instant active:scale-[0.92] disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete forever"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
