import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from '@capacitor/local-notifications';
import { autoRescheduleService } from "./services/autoRescheduleService";
import { notificationService } from "./services/notificationService";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Schedule from "./pages/Schedule";
import EditClass from "./pages/EditClass";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    console.log('[App] Setting up auto-reschedule on app open');
    
    // Create Android notification channel (if on Android)
    notificationService.createAndroidChannel().catch(err => {
      console.error('[App] Error creating Android notification channel:', err);
    });
    
    // Reschedule immediately when app loads
    autoRescheduleService.rescheduleActiveSchedule().catch(err => {
      console.error('[App] Error during initial auto-reschedule:', err);
    });

    const appStateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        console.log('[App] App came to foreground, rescheduling notifications');
        autoRescheduleService.rescheduleActiveSchedule().catch(err => {
          console.error('[App] Error during auto-reschedule:', err);
        });
      }
    });

    const notificationListener =
      LocalNotifications.addListener('localNotificationReceived', (notification) => {
        console.log('Notification received in foreground:', notification);

        // Optional: trigger state refresh / reschedule logic if needed
        // autoRescheduleService.handleNotification(notification);
      });

    // Set up periodic Sunday reschedule check (backup if app stays open)
    // Check every 30 minutes when app is in foreground
    const sundayCheckInterval = setInterval(() => {
      autoRescheduleService.checkAndRescheduleOnSunday().catch(err => {
        console.error('[App] Error during Sunday reschedule check:', err);
      });
    }, 30 * 60 * 1000); // 30 minutes

    return () => {
      appStateListener.then(l => l.remove());
      notificationListener.then(l => l.remove());
      clearInterval(sundayCheckInterval);
    };
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