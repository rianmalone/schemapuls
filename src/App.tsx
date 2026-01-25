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
  const [accessState, setAccessState] = useState<"loading" | "granted" | "denied" | "revoked">("loading");

  // Check access on mount and when app comes to foreground
  const checkAccess = async () => {
    const hasAccess = await checkServerAccess();
    
    if (hasAccess) {
      setAccessState("granted");
    } else {
      // Check if user previously had access (device ID exists)
      const deviceId = localStorage.getItem("schemapuls_device_id");
      if (deviceId) {
        // They had access before but it was revoked
        setAccessState("revoked");
      } else {
        setAccessState("denied");
      }
    }
  };

  useEffect(() => {
    checkAccess();
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
          checkAccess();
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

  // Show revoked message if access was removed
  if (accessState === "revoked") {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-2xl font-bold text-foreground">Åtkomst avslutad</h1>
            <p className="text-muted-foreground">
              Din åtkomstkod har inaktiverats. Kontakta din skola om du har frågor.
            </p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // Show code entry if no access
  if (accessState === "denied") {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <CodeEntry onSuccess={() => setAccessState("granted")} />
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
