import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { autoRescheduleService } from "./services/autoRescheduleService";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Schedule from "./pages/Schedule";
import EditClass from "./pages/EditClass";
import NotFound from "./pages/NotFound";
import CodeEntry, { checkServerAccess } from "./pages/CodeEntry";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const App = () => {
  // Check local flag first for instant access — no network wait
  const localAccess = localStorage.getItem("schemapuls_access") === "granted";
  const [accessState, setAccessState] = useState<"loading" | "granted" | "denied">(
    localAccess ? "granted" : "loading"
  );

  // Background server check — only used to REVOKE access, never to block launch
  const checkAccessInBackground = async () => {
    const hasAccess = await checkServerAccess();
    // Only revoke if server definitively says no access (not on network errors)
    if (hasAccess === false && localStorage.getItem("schemapuls_access") === "granted") {
      localStorage.removeItem("schemapuls_access");
      setAccessState("denied");
    }
  };

  useEffect(() => {
    if (localAccess) {
      // Already granted locally — just verify in background
      checkAccessInBackground();
    } else {
      // No local flag — need to check server (first launch or cleared data)
      const check = async () => {
        const hasAccess = await checkServerAccess();
        setAccessState(hasAccess ? "granted" : "denied");
        if (hasAccess) {
          localStorage.setItem("schemapuls_access", "granted");
        }
      };
      check();
    }
  }, []);

  useEffect(() => {
    // Reschedule notifications every time the app opens or comes to foreground
    if (Capacitor.isNativePlatform()) {
      console.log('[App] Setting up auto-reschedule on app open');
      
      // Reschedule immediately when app loads
      autoRescheduleService.rescheduleActiveSchedule().catch(err => {
        console.error('[App] Error during initial auto-reschedule:', err);
      });

      // Listen for app state changes (when app comes to foreground)
      const listener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          console.log('[App] App came to foreground, rescheduling notifications');
          autoRescheduleService.rescheduleActiveSchedule().catch(err => {
            console.error('[App] Error during auto-reschedule:', err);
          });
          
          // Also re-check access when app comes to foreground
          checkAccessInBackground();
        }
      });

      // Set up periodic Sunday reschedule check (backup if app stays open)
      // Check every 30 minutes when app is in foreground
      const sundayCheckInterval = setInterval(() => {
        autoRescheduleService.checkAndRescheduleOnSunday().catch(err => {
          console.error('[App] Error during Sunday reschedule check:', err);
        });
      }, 30 * 60 * 1000); // 30 minutes

      // Cleanup
      return () => {
        listener.then(l => l.remove());
        clearInterval(sundayCheckInterval);
      };
    }
  }, []);

  // Show loading spinner while checking access
  if (accessState === "loading") {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </ThemeProvider>
    );
  }

  // Show code entry if no access
  if (accessState === "denied") {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <CodeEntry onSuccess={() => {
          localStorage.setItem("schemapuls_access", "granted");
          setAccessState("granted");
        }} />
      </ThemeProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/edit-class/:id" element={<EditClass />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
