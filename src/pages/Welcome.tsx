// /welcome — first-run onboarding: splash → 14-step quiz → plan build →
// reveal → press-and-hold commit → signup. Answers persist to localStorage
// (ct-quiz-draft) at every step and resume from it. Authenticated users with
// !onboarding_completed resume here without splash/signup: the final step
// writes profile + goals for the existing session.

import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";
import { Shimmer } from "@/components/system";
import {
  buildSteps,
  computePlan,
  firstIncompleteStep,
  loadDraft,
  saveDraft,
  type Phase,
  type QuizAnswers,
} from "@/components/onboarding/quiz";
import { completeOnboarding } from "@/components/onboarding/persist";
import { STEP_COMPONENTS } from "@/components/onboarding/steps";
import { Splash } from "@/components/onboarding/Splash";
import { PlanBuildAnimation } from "@/components/onboarding/PlanBuildAnimation";
import { PlanReveal } from "@/components/onboarding/PlanReveal";
import { CommitHold } from "@/components/onboarding/CommitHold";
import { SignupStep } from "@/components/onboarding/SignupStep";

export default function Welcome() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useSession();
  const profileQuery = useProfile();

  // Draft loaded exactly once; state owns it afterwards.
  const [draft] = useState(() => loadDraft());
  const [answers, setAnswers] = useState<QuizAnswers>(() => draft?.answers ?? { units: "metric" });
  const [phase, setPhase] = useState<Phase>(() => draft?.phase ?? "splash");
  const [stepIndex, setStepIndex] = useState(() => draft?.stepIndex ?? 0);
  const [saving, setSaving] = useState(false);
  const autoFinishing = useRef(false);

  const steps = useMemo(() => buildSteps(answers), [answers]);
  const index = Math.min(stepIndex, steps.length - 1);
  const plan = useMemo(() => computePlan(answers), [answers]);

  const authed = !!session;
  const onboarded = !!profileQuery.data?.onboarding_completed;

  /* ── persistence: save the draft at every step/phase change ── */
  useEffect(() => {
    if (phase === "splash") return;
    saveDraft({ v: 1, answers, phase, stepIndex: index });
  }, [answers, phase, index]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [index, phase]);

  /* ── resume rules for already-authenticated users ── */
  useEffect(() => {
    if (authed && !onboarded && phase === "splash") setPhase("quiz");
  }, [authed, onboarded, phase]);

  /* ── recover from a corrupt/partial draft ── */
  useEffect(() => {
    if (phase !== "splash" && phase !== "quiz" && !plan) {
      setPhase("quiz");
      setStepIndex(firstIncompleteStep(answers));
    }
  }, [phase, plan, answers]);

  const finish = async (uid: string, email: string | null): Promise<void> => {
    setSaving(true);
    try {
      await completeOnboarding(uid, email, answers);
      // Hard navigate: resets the query cache so onboarding_completed re-reads fresh.
      window.location.assign("/");
    } catch (err) {
      setSaving(false);
      toast.error("Couldn't save your plan. Please try again.");
      throw err;
    }
  };

  /* ── authed user whose draft already reached signup: write + go ── */
  useEffect(() => {
    if (authed && !onboarded && !profileQuery.isLoading && phase === "signup" && plan && !autoFinishing.current) {
      autoFinishing.current = true;
      finish(session.user.id, session.user.email ?? null).catch(() => {
        autoFinishing.current = false;
        setPhase("commit");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, onboarded, profileQuery.isLoading, phase, plan]);

  /* ── gates ── */
  if (authLoading || (authed && profileQuery.isLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-md space-y-3 px-4 pt-8">
          <Shimmer className="h-2 w-full rounded-full" />
          <Shimmer className="mt-6 h-7 w-3/4 rounded-control" />
          <Shimmer className="h-14 w-full rounded-control" />
          <Shimmer className="h-14 w-full rounded-control" />
          <Shimmer className="h-14 w-full rounded-control" />
        </div>
      </div>
    );
  }
  if (authed && onboarded) {
    return <Navigate to="/" replace />;
  }

  /* ── quiz plumbing ── */
  const patch = (p: Partial<QuizAnswers>) => setAnswers((a) => ({ ...a, ...p }));
  const next = () => {
    if (index >= steps.length - 1) setPhase("build");
    else setStepIndex(index + 1);
  };
  const back = () => {
    if (index === 0) {
      if (!authed) setPhase("splash");
    } else {
      setStepIndex(index - 1);
    }
  };

  const stepId = steps[index];
  const StepComponent = STEP_COMPONENTS[stepId];
  const showBack = index > 0 || !authed;

  let content: JSX.Element;
  if (saving) {
    content = (
      <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-body text-secondary-text">Locking in your plan…</p>
      </div>
    );
  } else if (phase === "splash") {
    content = <Splash onStart={() => setPhase("quiz")} onSignIn={() => navigate("/auth")} />;
  } else if (phase === "quiz") {
    content = (
      <>
        <div className="flex items-center gap-3 pt-4">
          {showBack ? (
            <button
              type="button"
              aria-label="Back"
              onClick={back}
              className="-ml-3 grid h-11 w-11 shrink-0 place-items-center rounded-full text-foreground transition-transform duration-instant active:scale-[0.92]"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : (
            <div className="h-11 w-2 shrink-0" />
          )}
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-valuenow={index + 1}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-standard"
              style={{ width: `${((index + 1) / steps.length) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
            {index + 1}/{steps.length}
          </span>
        </div>
        <div className="flex-1 pt-8">
          <StepComponent key={stepId} answers={answers} patch={patch} next={next} />
        </div>
      </>
    );
  } else if (phase === "build" && plan) {
    content = <PlanBuildAnimation plan={plan} units={answers.units} onDone={() => setPhase("reveal")} />;
  } else if (phase === "reveal" && plan) {
    content = (
      <PlanReveal
        plan={plan}
        units={answers.units}
        goalWeightKg={answers.goalWeightKg}
        onContinue={() => setPhase("commit")}
      />
    );
  } else if (phase === "commit") {
    content = (
      <CommitHold
        onCommit={() => {
          if (authed) {
            finish(session.user.id, session.user.email ?? null).catch(() => undefined);
          } else {
            setPhase("signup");
          }
        }}
      />
    );
  } else if (phase === "signup") {
    content = authed ? (
      // The auto-finish effect handles this; brief spinner while it kicks in.
      <div className="flex flex-1 flex-col items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ) : (
      <SignupStep onAccountReady={finish} />
    );
  } else {
    // plan missing for build/reveal — the recovery effect will reroute to quiz.
    content = (
      <div className="flex flex-1 flex-col items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-8">{content}</div>
    </div>
  );
}
