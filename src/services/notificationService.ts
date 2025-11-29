import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

interface Class {
  id: string;
  name: string;
  start: string;
  end: string;
  color: string;
  room?: string;
}

interface WeekSchedule {
  monday: Class[];
  tuesday: Class[];
  wednesday: Class[];
  thursday: Class[];
  friday: Class[];
}

// Stable notification ID generator - returns an integer ID (max 9 digits)
function generateNotificationId(classId: string, targetDateIso: string): number {
  const input = `${classId}|${targetDateIso}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  // Keep it within a safe integer range for notifications
  return hash % 1000000000;
}

export class NotificationService {
  private static instance: NotificationService;
  private scheduleWindowDays = 7; // Only schedule next N days

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  setScheduleWindowDays(days: number): void {
    this.scheduleWindowDays = Math.max(1, Math.min(days, 14)); // 1-14 days
  }

  async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Not running on native platform');
      return false;
    }

    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async checkPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('[Notifications] Not on native platform');
      return false;
    }

    try {
      const result = await LocalNotifications.checkPermissions();
      const hasPermission = result.display === 'granted';
      console.log('[Notifications] Permission status:', hasPermission ? 'granted' : 'denied');
      return hasPermission;
    } catch (error) {
      console.error('[Notifications] Error checking permissions:', error);
      return false;
    }
  }

  async scheduleNotifications(
    schedule: WeekSchedule,
    enabledClasses: Record<string, boolean>,
    enabledDays: Record<string, boolean>,
    notificationMinutes: number,
    scheduleType: string = 'weekly'
  ): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('[Notifications] Not running on native platform, skipping notifications');
      return;
    }

    try {
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        console.log('[Notifications] No notification permission');
        return;
      }

      // Get currently pending notifications
      const pending = await LocalNotifications.getPending();
      const pendingMap = new Set(pending.notifications.map((n: any) => n.id));
      const toScheduleIds = new Set<number>();
      const notifications: any[] = [];

      const dayMap: Record<string, number> = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
      };

      const now = new Date();
      console.log('[Notifications] Starting scheduling for next', this.scheduleWindowDays, 'days');
      console.log('[Notifications] Schedule type:', scheduleType);
      console.log('[Notifications] Notification minutes before:', notificationMinutes);

      // Schedule notifications for the next N days (not weeks)
      for (let dayOffset = 0; dayOffset < this.scheduleWindowDays; dayOffset++) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + dayOffset);
        targetDate.setHours(0, 0, 0, 0);
        
        const targetDayOfWeek = targetDate.getDay() || 7; // Sunday = 7, Monday = 1
        const targetDateIso = targetDate.toISOString().slice(0, 10); // YYYY-MM-DD
        
        // Find the day key for this date
        let dayKey: string | null = null;
        for (const [key, dayNum] of Object.entries(dayMap)) {
          if (dayNum === targetDayOfWeek) {
            dayKey = key;
            break;
          }
        }
        
        if (!dayKey || !enabledDays[dayKey]) {
          continue; // Skip disabled days
        }

        // For odd-even schedules, check week parity
        if (scheduleType === 'odd-even') {
          const targetWeekNumber = this.getWeekNumber(targetDate);
          const isTargetOddWeek = targetWeekNumber % 2 === 1;
          const currentWeekNumber = this.getWeekNumber(now);
          const isCurrentOddWeek = currentWeekNumber % 2 === 1;
          
          // Skip if this date doesn't match the active schedule's week parity
          if (isTargetOddWeek !== isCurrentOddWeek) {
            continue;
          }
        }

        const classes = schedule[dayKey as keyof WeekSchedule];
        if (!classes) continue;

        classes.forEach((classItem) => {
          if (!enabledClasses[classItem.id]) return;

          const [hours, minutes] = classItem.start.split(':').map(Number);
          
          // Calculate the actual lesson start time for this specific date
          const lessonStartTime = new Date(targetDate);
          lessonStartTime.setHours(hours, minutes, 0, 0);
          
          // Skip if lesson already started
          if (lessonStartTime <= now) {
            return;
          }

          // Calculate reminder time (lesson start - notification minutes)
          const reminderTime = new Date(lessonStartTime);
          reminderTime.setMinutes(reminderTime.getMinutes() - notificationMinutes);
          reminderTime.setSeconds(0, 0); // Zero out seconds for exact times

          // Determine notification schedule time
          let notificationTime: Date;
          let notificationTitle: string;
          
          if (reminderTime > now) {
            // Case 1: Reminder time is in the future - schedule normally
            notificationTime = reminderTime;
            notificationTitle = `${classItem.name} om ${notificationMinutes} minuter`;
          } else if (lessonStartTime > now) {
            // Case 2: Reminder time passed but lesson hasn't started - immediate notification
            notificationTime = new Date(now.getTime() + 3000); // 3 seconds from now
            const minutesUntilStart = Math.ceil((lessonStartTime.getTime() - now.getTime()) / 60000);
            notificationTitle = `${classItem.name} börjar om ${minutesUntilStart} ${minutesUntilStart === 1 ? 'minut' : 'minuter'}`;
          } else {
            // Case 3: Lesson already started - skip
            return;
          }

          // Generate stable notification ID using hash of classId and date
          const notificationId = generateNotificationId(classItem.id, targetDateIso);
          toScheduleIds.add(notificationId);
          
          notifications.push({
            id: notificationId,
            title: notificationTitle,
            body: `${classItem.room ? `Sal: ${classItem.room} • ` : ''}Börjar ${classItem.start}`,
            schedule: {
              at: notificationTime,
            },
            sound: 'default',
            actionTypeId: '',
            extra: {
              classId: classItem.id,
              targetDate: targetDateIso,
            },
          });
        });
      }

      // Only cancel notifications that are being replaced (targeted cancellation)
      const idsToCancel = Array.from(pendingMap).filter(id => toScheduleIds.has(id));
      
      console.log('[Notifications] Total pending before:', pendingMap.size);
      console.log('[Notifications] Will cancel IDs:', idsToCancel);
      console.log('[Notifications] Will schedule:', notifications.length, 'notifications');
      
      if (idsToCancel.length > 0) {
        await LocalNotifications.cancel({
          notifications: idsToCancel.map(id => ({ id }))
        });
        console.log('[Notifications] Cancelled', idsToCancel.length, 'existing notifications');
      }

      if (notifications.length > 0) {
        // iOS has a limit of 64 notifications, so we take the first 64
        const notificationsToSchedule = notifications.slice(0, 64);
        
        // Log each notification for debugging
        notificationsToSchedule.forEach(n => {
          console.log('[Notifications] Schedule ID:', n.id, 'at', n.schedule.at, '|', n.title);
        });
        
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        console.log('[Notifications] ✅ Successfully scheduled', notificationsToSchedule.length, 'notifications');
        
        if (notifications.length > 64) {
          console.warn('[Notifications] ⚠️ Truncated to 64 notifications (iOS limit)');
        }
      } else {
        console.log('[Notifications] No notifications to schedule');
      }
    } catch (error) {
      console.error('[Notifications] Error scheduling notifications:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        console.log('[Notifications] Cancelling all', pending.notifications.length, 'notifications');
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    } catch (error) {
      console.error('[Notifications] Error canceling notifications:', error);
    }
  }

  async getPendingNotifications(): Promise<any[]> {
    if (!Capacitor.isNativePlatform()) {
      return [];
    }

    try {
      const pending = await LocalNotifications.getPending();
      console.log('[Notifications] Pending notifications:', pending.notifications.length);
      pending.notifications.forEach((n: any) => {
        console.log('[Notifications] Pending ID:', n.id, 'at', n.schedule?.at, '|', n.title);
      });
      return pending.notifications;
    } catch (error) {
      console.error('[Notifications] Error getting pending notifications:', error);
      return [];
    }
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
  }
}

export const notificationService = NotificationService.getInstance();
