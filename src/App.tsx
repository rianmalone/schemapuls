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
import { supabase } from "@/integrations/supabase/client";
import CodeEntry from "./components/CodeEntry";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Schedule from "./pages/Schedule";
import EditClass from "./pages/EditClass";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const checkServerAccess = async (): Promise<boolean> => {
  const deviceId = localStorage.getItem("schemapuls_device_id");
  if (!deviceId) return false;
  
  try {
    const { data, error } = await supabase.functions.invoke("validate-code", {
      body: { action: "check", deviceId },
    });
    if (error) return false;
    return data?.success === true;
  } catch {
    // If offline, trust local storage
    return localStorage.getItem("schemapuls_access") === "granted";
  }
};

const App = () => {
  const [accessState, setAccessState] = useState<"loading" | "granted" | "denied">("loading");

  useEffect(() => {
    const checkAccess = async () => {
      const localAccess = localStorage.getItem("schemapuls_access");
      if (localAccess !== "granted") {
        setAccessState("denied");
        return;
      }
      const serverOk = await checkServerAccess();
      if (serverOk) {
        setAccessState("granted");
      } else {
        localStorage.removeItem("schemapuls_access");
        setAccessState("denied");
      }
    };

    checkAccess();
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform() && accessState === "granted") {
      console.log('[App] Setting up auto-reschedule on app open');
      
      autoRescheduleService.rescheduleActiveSchedule().catch(err => {
        console.error('[App] Error during initial auto-reschedule:', err);
      });

      const listener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          console.log('[App] App came to foreground, rescheduling notifications');
          autoRescheduleService.rescheduleActiveSchedule().catch(err => {
            console.error('[App] Error during auto-reschedule:', err);
          });

          // Re-check access on foreground
          checkServerAccess().then(ok => {
            if (!ok) {
              localStorage.removeItem("schemapuls_access");
              setAccessState("denied");
            }
          });
        }
      });

      const sundayCheckInterval = setInterval(() => {
        autoRescheduleService.checkAndRescheduleOnSunday().catch(err => {
          console.error('[App] Error during Sunday reschedule check:', err);
        });
      }, 30 * 60 * 1000);

      return () => {
        listener.then(l => l.remove());
        clearInterval(sundayCheckInterval);
      };
    }
  }, [accessState]);

  // Loading state
  if (accessState === "loading") {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </ThemeProvider>
    );
  }

  // Denied - show code entry
  if (accessState === "denied") {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <CodeEntry onAccessGranted={() => setAccessState("granted")} />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
