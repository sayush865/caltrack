import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
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

function ProtectedRoute({ children, requireOnboarding = true }: { children: React.ReactNode; requireOnboarding?: boolean }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthenticated(!!session);
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single();
        
        setOnboardingComplete(profile?.onboarding_completed || false);
      }
      
      setIsLoading(false);
    });

    // THEN check for existing session with a small delay to ensure storage is ready
    const checkSession = async () => {
      // Small timeout to allow localStorage to be fully ready after hot reload
      await new Promise(resolve => setTimeout(resolve, 100));
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single();
        
        setOnboardingComplete(profile?.onboarding_completed || false);
      }
      
      setIsLoading(false);
    };
    
    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
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
