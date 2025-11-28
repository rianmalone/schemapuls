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

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
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
      return false;
    }

    try {
      const result = await LocalNotifications.checkPermissions();
      return result.display === 'granted';
    } catch (error) {
      console.error('Error checking notification permissions:', error);
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
      console.log('Not running on native platform, skipping notifications');
      return;
    }

    try {
      // Get currently pending notifications
      const pending = await LocalNotifications.getPending();
      const pendingMap = new Set(pending.notifications.map((n: any) => n.id));
      const toScheduleIds = new Set<number>();

      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        console.log('No notification permission');
        return;
      }

      const notifications: any[] = [];
      const dayMap: Record<string, number> = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
      };

      // Get current date and week number
      const now = new Date();
      const isOddWeek = this.getWeekNumber(now) % 2 === 1;

      // Schedule notifications for the next 4 weeks
      for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
        Object.entries(schedule).forEach(([day, classes]) => {
          if (!enabledDays[day]) return;

          classes.forEach((classItem) => {
            if (!enabledClasses[classItem.id]) return;

            const [hours, minutes] = classItem.start.split(':').map(Number);
            const targetDay = dayMap[day];
            
            // Calculate the actual lesson start time
            const lessonStartTime = new Date(now);
            lessonStartTime.setHours(hours, minutes, 0, 0);
            
            const currentDay = lessonStartTime.getDay() || 7; // Sunday = 7
            let daysUntilClass = targetDay - currentDay;
            
            if (daysUntilClass < 0 || (daysUntilClass === 0 && lessonStartTime <= now)) {
              daysUntilClass += 7;
            }
            
            lessonStartTime.setDate(lessonStartTime.getDate() + daysUntilClass + (weekOffset * 7));
            
            // For odd-even schedules, only schedule if week matches
            if (scheduleType === 'odd-even') {
              const classWeekNumber = this.getWeekNumber(lessonStartTime);
              const isClassOddWeek = classWeekNumber % 2 === 1;
              
              // Skip if this class is in the wrong week type
              // This assumes we're scheduling from the "active" schedule
              if (isClassOddWeek !== isOddWeek) {
                return;
              }
            }

            // Calculate reminder time (lesson start - notification minutes)
            const reminderTime = new Date(lessonStartTime);
            reminderTime.setMinutes(reminderTime.getMinutes() - notificationMinutes);
            reminderTime.setSeconds(0);

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

            const notificationId = parseInt(`${classItem.id.slice(-6)}${weekOffset}${targetDay}`);
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
              },
            });
          });
        });
      }

      // Only cancel notifications that are being replaced
      const idsToCancel = Array.from(pendingMap).filter(id => toScheduleIds.has(id));
      if (idsToCancel.length > 0) {
        await LocalNotifications.cancel({
          notifications: idsToCancel.map(id => ({ id }))
        });
      }

      if (notifications.length > 0) {
        // iOS has a limit of 64 notifications, so we take the first 64
        const notificationsToSchedule = notifications.slice(0, 64);
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        console.log(`Scheduled ${notificationsToSchedule.length} notifications`);
      }
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    } catch (error) {
      console.error('Error canceling notifications:', error);
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
