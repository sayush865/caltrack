import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { RotateCcw } from "lucide-react";

import { AuthProvider, useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";
import BottomNav from "@/components/BottomNav";
import { LogSheetProvider } from "@/components/LogSheet";
import { ConfettiHost } from "@/components/system";

import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Today from "./pages/Today";
import Diary from "./pages/Diary";
import Insights from "./pages/Insights";
import You from "./pages/You";
import Scan from "./pages/Scan";
import Describe from "./pages/Describe";
import Foods from "./pages/Foods";
import Exercise from "./pages/Exercise";
import MealDetail from "./pages/MealDetail";
import YouGoals from "./pages/YouGoals";
import YouWeight from "./pages/YouWeight";
import YouMilestones from "./pages/YouMilestones";
import YouSettings from "./pages/YouSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

/* ── Route-level error boundary ─────────────────────────────── */

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Route error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-md rounded-card border border-border bg-card p-6 text-center shadow-card">
            <h1 className="text-heading text-foreground">Something went wrong</h1>
            <p className="mt-2 text-body text-muted-foreground">
              An unexpected error interrupted the app. Your logged data is safe.
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-5 inline-flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-control bg-primary px-6 text-label text-primary-foreground transition-transform duration-instant active:scale-[0.92]"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Auth gate (session + onboarding from cache, no refetching) ── */

function ShellSkeleton() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md space-y-3 bg-background px-4 pt-8">
      <div className="shimmer h-8 w-40 rounded-control" />
      <div className="shimmer h-64 w-full rounded-card" />
      <div className="shimmer h-20 w-full rounded-card" />
      <div className="shimmer h-20 w-full rounded-card" />
    </div>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const profileQuery = useProfile();

  if (loading || (session && profileQuery.isLoading)) {
    return <ShellSkeleton />;
  }
  if (!session) {
    return <Navigate to="/welcome" replace />;
  }
  if (!profileQuery.data?.onboarding_completed) {
    return <Navigate to="/welcome" replace />;
  }
  return <>{children}</>;
}

/** Tab destinations: BottomNav + FAB LogSheet. */
function TabLayout() {
  return (
    <AuthGate>
      <LogSheetProvider>
        <Outlet />
        <BottomNav />
      </LogSheetProvider>
    </AuthGate>
  );
}

/** Stacked pages: auth-gated, no BottomNav. */
function StackLayout() {
  return (
    <AuthGate>
      <Outlet />
    </AuthGate>
  );
}

/* ── App ────────────────────────────────────────────────────── */

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Toaster position="top-center" richColors={false} />
      <ConfettiHost />
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            {/* Public */}
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/auth" element={<Auth />} />

            {/* Tabs (BottomNav) */}
            <Route element={<TabLayout />}>
              <Route path="/" element={<Today />} />
              <Route path="/log" element={<Diary />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/you" element={<You />} />
            </Route>

            {/* Stacked (no BottomNav) */}
            <Route element={<StackLayout />}>
              <Route path="/scan" element={<Scan />} />
              <Route path="/describe" element={<Describe />} />
              <Route path="/foods" element={<Foods />} />
              <Route path="/exercise" element={<Exercise />} />
              <Route path="/meal/:mealId" element={<MealDetail />} />
              <Route path="/you/goals" element={<YouGoals />} />
              <Route path="/you/weight" element={<YouWeight />} />
              <Route path="/you/milestones" element={<YouMilestones />} />
              <Route path="/you/settings" element={<YouSettings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
