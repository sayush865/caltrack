import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DailyLog from "./pages/DailyLog";
import Camera from "./pages/Camera";
import FoodDatabase from "./pages/FoodDatabase";
import Settings from "./pages/Settings";
import Goals from "./pages/Goals";
import EditFoodLog from "./pages/EditFoodLog";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/BottomNav";

const queryClient = new QueryClient();

function ProtectedRoute({
  children,
  requireOnboarding = true,
}: {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}) {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOnboardingStatus = useCallback(async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .single();

    setOnboardingComplete(!!profile?.onboarding_completed);
  }, []);

  useEffect(() => {
    // Listener MUST be synchronous; defer any backend calls.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authed = !!session;
      setIsAuthenticated(authed);

      if (!session?.user) {
        setOnboardingComplete(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setTimeout(() => {
        fetchOnboardingStatus(session.user.id)
          .catch(() => setOnboardingComplete(false))
          .finally(() => setIsLoading(false));
      }, 0);
    });

    const checkSession = async () => {
      // Small timeout to allow localStorage to be fully ready after hot reload
      await new Promise((resolve) => setTimeout(resolve, 100));
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setIsAuthenticated(!!session);

      if (!session?.user) {
        setOnboardingComplete(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      await fetchOnboardingStatus(session.user.id).catch(() => setOnboardingComplete(false));
      setIsLoading(false);
    };

    checkSession();

    return () => subscription.unsubscribe();
  }, [fetchOnboardingStatus]);

  // Re-check profile when navigating, so finishing onboarding immediately reflects on protected routes.
  useEffect(() => {
    const refresh = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchOnboardingStatus(session.user.id).catch(() => setOnboardingComplete(false));
      }
    };

    refresh();
  }, [location.pathname, fetchOnboardingStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }

  if (requireOnboarding && !onboardingComplete) {
    return <Navigate to="/onboarding" />;
  }

  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<ProtectedRoute requireOnboarding={false}><Onboarding /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/daily-log" element={<ProtectedRoute><DailyLog /></ProtectedRoute>} />
          <Route path="/camera" element={<ProtectedRoute><Camera /></ProtectedRoute>} />
          <Route path="/food-database" element={<ProtectedRoute><FoodDatabase /></ProtectedRoute>} />
          <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/edit-food/:id" element={<ProtectedRoute><EditFoodLog /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
