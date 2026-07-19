// First-run splash: logo motif + tagline + "Build my plan" / "I have an account".

import { ScanLine } from "lucide-react";
import { GhostButton, PrimaryButton } from "./ui";

export function Splash({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  return (
    <div className="flex flex-1 animate-fade-rise flex-col justify-between py-12">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="grid h-24 w-24 place-items-center rounded-[28px] bg-primary-soft">
          <ScanLine className="h-11 w-11 text-primary" strokeWidth={1.75} />
        </div>
        <p className="mt-5 font-display text-display-md text-foreground">CalTrack</p>
        <h1 className="mt-6 max-w-xs text-title text-foreground">
          Log it in a photo. Trust the number. Keep the habit.
        </h1>
        <p className="mt-3 max-w-xs text-body text-muted-foreground">
          Snap your plate, get calories and macros in seconds, and a plan that adapts to your real
          data every week.
        </p>
      </div>

      <div className="space-y-2">
        <PrimaryButton onClick={onStart}>Build my plan</PrimaryButton>
        <GhostButton onClick={onSignIn}>I have an account</GhostButton>
      </div>
    </div>
  );
}
