import { notificationService } from './notificationService';
import { Capacitor } from '@capacitor/core';

interface WeekSchedule {
  monday: any[];
  tuesday: any[];
  wednesday: any[];
  thursday: any[];
  friday: any[];
}

/**
 * Simple service to automatically reschedule notifications for the active schedule
 * every time the app opens/comes to foreground
 */
export class AutoRescheduleService {
  private static instance: AutoRescheduleService;
  private readonly SUNDAY_RESCHEDULE_KEY = 'lastSundayReschedule';

  private constructor() {}

  static getInstance(): AutoRescheduleService {
    if (!AutoRescheduleService.instance) {
      AutoRescheduleService.instance = new AutoRescheduleService();
    }
    return AutoRescheduleService.instance;
  }


  /**
   * Check if we should reschedule on Sunday (backup reschedule)
   * Returns true if it's Sunday and we haven't rescheduled in the last 6 hours
   */
  private shouldRescheduleOnSunday(): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // Only check on Sunday
    if (dayOfWeek !== 0) {
      return false;
    }

    const lastRescheduleStr = localStorage.getItem(this.SUNDAY_RESCHEDULE_KEY);
    
    if (!lastRescheduleStr) {
      // Never rescheduled on a Sunday - do it
      return true;
    }

    try {
      const lastReschedule = new Date(lastRescheduleStr);
      const hoursSinceLastReschedule = (now.getTime() - lastReschedule.getTime()) / (1000 * 60 * 60);
      
      // Reschedule if we haven't rescheduled in the last 6 hours (allows for multiple checks throughout Sunday)
      return hoursSinceLastReschedule >= 6;
    } catch (error) {
      console.error('[AutoReschedule] Error checking Sunday reschedule time:', error);
      return false;
    }
  }

  /**
   * Automatically reschedule notifications for the active schedule
   * Called every time the app opens or comes to foreground
   */
  async rescheduleActiveSchedule(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('[AutoReschedule] Not on native platform, skipping');
      return;
    }

    try {
      const activeScheduleId = localStorage.getItem('activeScheduleId');
      if (!activeScheduleId) {
        console.log('[AutoReschedule] No active schedule ID found');
        return;
      }

      // Check if we have permission
      const hasPermission = await notificationService.checkPermissions();
      if (!hasPermission) {
        console.log('[AutoReschedule] No notification permission');
        return;
      }

      // Load schedule data
      const scheduleData = localStorage.getItem(`schedule_${activeScheduleId}`);
      if (!scheduleData) {
        console.log('[AutoReschedule] No schedule data found for active schedule');
        return;
      }

      const schedule: WeekSchedule = JSON.parse(scheduleData);
      
      // Load enabled classes (per-schedule key)
      const savedEnabledClasses = localStorage.getItem(`enabledClasses_${activeScheduleId}`);
      let enabledClasses = savedEnabledClasses ? JSON.parse(savedEnabledClasses) : {};
      
      // If no enabled classes saved, enable all by default
      if (Object.keys(enabledClasses).length === 0) {
        Object.values(schedule).forEach((dayClasses: any[]) => {
          if (Array.isArray(dayClasses)) {
            dayClasses.forEach((classItem: any) => {
              if (classItem && classItem.id) {
                enabledClasses[classItem.id] = true;
              }
            });
          }
        });
        localStorage.setItem(`enabledClasses_${activeScheduleId}`, JSON.stringify(enabledClasses));
      }

      // Load enabled days (per-schedule key)
      const savedEnabledDays = localStorage.getItem(`enabledDays_${activeScheduleId}`);
      const enabledDays = savedEnabledDays 
        ? JSON.parse(savedEnabledDays)
        : { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true };

      // Get notification minutes (use globalNotificationMinutes as set in Schedule.tsx)
      const notificationMinutes = parseInt(localStorage.getItem('globalNotificationMinutes') || '5', 10);

      console.log('[AutoReschedule] Rescheduling notifications for active schedule:', activeScheduleId);
      console.log('[AutoReschedule] Enabled classes:', Object.keys(enabledClasses).length);
      console.log('[AutoReschedule] Enabled days:', enabledDays);
      console.log('[AutoReschedule] Notification minutes:', notificationMinutes);

      // Reschedule notifications - this will schedule for the next 7 days
      // The notification service handles canceling old ones and scheduling new ones
      await notificationService.scheduleNotifications(
        schedule,
        enabledClasses,
        enabledDays,
        notificationMinutes,
        'weekly'
      );

      console.log('[AutoReschedule] ✅ Auto-reschedule complete');
    } catch (error) {
      console.error('[AutoReschedule] Error during auto-reschedule:', error);
    }
  }

  /**
   * Check if we should reschedule on Sunday and do it (backup reschedule)
   * Called periodically when app is in foreground
   */
  async checkAndRescheduleOnSunday(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    if (this.shouldRescheduleOnSunday()) {
      console.log('[AutoReschedule] Sunday detected - performing backup reschedule');
      await this.rescheduleActiveSchedule();
      
      // Mark that we rescheduled on Sunday
      localStorage.setItem(this.SUNDAY_RESCHEDULE_KEY, new Date().toISOString());
    }
  }
}

export const autoRescheduleService = AutoRescheduleService.getInstance();

