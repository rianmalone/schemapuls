import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { autoRescheduleService } from "./services/autoRescheduleService";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Schedule from "./pages/Schedule";
import EditClass from "./pages/EditClass";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
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