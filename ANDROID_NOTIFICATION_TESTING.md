# Android Notification Testing Checklist

## Overview
This document provides a step-by-step test plan for verifying Android heads-up notifications work correctly on SchemaPuls.

## Pre-Test Setup

### 1. Build Commands
```bash
# From project root
git checkout android-notifications-clean
git pull --rebase origin android-notifications-clean
npm install  # This will run patch-package automatically via postinstall
npx cap sync android
npx cap open android
```

### 2. Build Debug APK
From Android Studio or command line:
```bash
cd android
.\gradlew.bat assembleDebug
```

### 3. Install to Device
```bash
# List connected devices
adb devices

# Fresh install (uninstall first to test fresh install scenario)
adb uninstall app.lovable.klasspuls

# Install debug APK
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

### 4. Enable Developer Options & USB Debugging
- On Samsung device: Settings > About Phone > Tap "Build Number" 7 times
- Enable "USB Debugging" in Developer Options
- Connect device via USB

## Test Scenarios

### Test 1: Fresh Install - Permission Request
**Objective**: Verify POST_NOTIFICATIONS permission is requested on Android 13+

1. Uninstall app completely (`adb uninstall app.lovable.klasspuls`)
2. Install fresh APK
3. Launch app
4. **Expected**: Permission dialog should appear asking for notification permission
5. Grant permission
6. **Check logs**: `adb logcat | findstr "LocalNotificationManager"`
   - Should see: "Channel created successfully" with IMPORTANCE_HIGH
   - Should see: "DEBUG: Test notification sent" (if debug code is enabled)

**Pass Criteria**: Permission requested, channel created with HIGH importance

---

### Test 2: Channel Creation & Importance
**Objective**: Verify notification channel is created with HIGH importance

1. Open app
2. **Check logs**: `adb logcat | findstr "LocalNotificationManager"`
   - Look for: "DEBUG: Channel created successfully - ID: schemapuls_alerts, Importance: 4 (HIGH=4)"
3. **Verify channels**: 
   ```bash
   adb shell dumpsys notification | findstr -A 10 schemapuls
   ```
   - Should show channel with importance=4 (HIGH)
   - Should show vibration, lights, badge enabled

**Pass Criteria**: Channel exists with IMPORTANCE_HIGH (4), all features enabled

---

### Test 3: Immediate Test Notification (Heads-Up)
**Objective**: Verify heads-up notification appears when app is in foreground

1. Open app
2. Wait 2-3 seconds (debug notification should fire automatically)
3. **Expected**: Heads-up notification should pop up on screen (even with app open)
4. **Verify**: Notification appears as overlay/banner on top of app

**Pass Criteria**: Notification appears as heads-up popup while app is open

---

### Test 4: Scheduled Notification - App in Background (Screen On)
**Objective**: Verify scheduled notification fires when app is backgrounded

1. Schedule a test notification for 30 seconds in the future
2. Put app in background (press Home button)
3. Keep screen on
4. Wait for notification to fire
5. **Expected**: Heads-up notification should appear on screen
6. **Verify**: Notification appears as heads-up popup, appears in notification shade

**Pass Criteria**: Heads-up notification appears while app is backgrounded (screen on)

---

### Test 5: Scheduled Notification - Device Locked/Screen Off
**Objective**: Verify scheduled notification fires when device is locked

1. Schedule a test notification for 30 seconds in the future
2. Lock device (press power button)
3. Wait for notification to fire
4. Unlock device
5. **Expected**: Notification should be visible in notification shade
6. If device supports "Ambient Display" or "Always On Display", notification may show on lock screen

**Pass Criteria**: Notification appears when device is locked/screen off

---

### Test 6: Scheduled Notification - Exact Time
**Objective**: Verify notifications fire at exact scheduled time

1. Schedule notification for exactly 2 minutes from now (note exact time)
2. Lock device or put app in background
3. Wait for scheduled time
4. **Check logs**: `adb logcat | findstr "DEBUG: Alarm"`
   - Should show: "DEBUG: ✅ Exact alarm scheduled" or similar
5. **Verify**: Notification fires within 1-2 seconds of scheduled time

**Pass Criteria**: Notification fires at exact scheduled time (±2 seconds tolerance)

---

### Test 7: Multiple Scheduled Notifications
**Objective**: Verify multiple notifications don't duplicate

1. Schedule 3 notifications: 30s, 60s, 90s from now
2. Put app in background
3. Wait for all notifications to fire
4. **Verify**: Each notification has unique ID and content
5. **Check logs**: `adb logcat | findstr "DEBUG: Scheduling notification"`
   - Should show unique IDs for each notification

**Pass Criteria**: All notifications fire, no duplicates, unique IDs

---

### Test 8: Restore Receiver - No Duplicates
**Objective**: Verify past notifications are not re-posted on app restart

1. Schedule notification for 10 seconds from now
2. Wait for notification to fire
3. Close app completely (swipe away from recent apps)
4. Restart app
5. **Expected**: Past notification should NOT be re-posted
6. **Check logs**: `adb logcat | findstr "LocalNotificationRestore"`
   - Should show: "DEBUG: Deleting past non-repeating notification ID: X"
   - Should NOT show: "Rescheduling" for already-fired notifications

**Pass Criteria**: Past notifications are deleted, not re-posted

---

### Test 9: Samsung/OEM Battery Optimization
**Objective**: Verify battery optimization warnings and guide user

1. Go to Settings > Apps > SchemaPuls > Battery
2. Check if "Unrestricted" is selected (if not, set it)
3. **Check logs**: `adb logcat | findstr "Battery optimization"`
   - Should show warning if battery optimization is enabled
4. **Expected**: Logs should guide user to disable battery optimization

**Pass Criteria**: Battery optimization detection works, logs guide user

**Manual Steps for Samsung Users:**
1. Settings > Apps > SchemaPuls
2. Battery > Background usage limits > Don't optimize
3. OR: Settings > Device care > Battery > Background app limits > Add SchemaPuls to "Never sleeping apps"

---

### Test 10: Exact Alarm Permission (Android 12+)
**Objective**: Verify exact alarm permission handling

1. Go to Settings > Apps > SchemaPuls > Additional settings > Special app access > Alarms & reminders
2. **Expected**: SchemaPuls should be listed (if not granted)
3. Grant permission if needed
4. **Check logs**: `adb logcat | findstr "canScheduleExactAlarms"`
   - Should show whether exact alarms are allowed

**Pass Criteria**: Exact alarm permission can be checked and requested

---

## Logging & Debug Commands

### View All Notification Logs
```bash
adb logcat | findstr -i "LocalNotificationManager\|LocalNotificationRestore\|TimedNotification\|NotificationChannel\|schemapuls"
```

### View Notification Channels
```bash
adb shell dumpsys notification | findstr -A 15 schemapuls
```

### View Active Notifications
```bash
adb shell dumpsys notification | findstr -A 20 "NotificationRecord"
```

### Clear Logcat
```bash
adb logcat -c
```

### Filter by Tag (More Precise)
```bash
adb logcat -s LocalNotificationManager:D LocalNotificationRestore:D
```

---

## Expected Log Output (Success Case)

### On App Start:
```
LocalNotificationManager: DEBUG: LocalNotificationManager initialized with channel: schemapuls_alerts
LocalNotificationManager: DEBUG: Existing notification channels before deletion:
LocalNotificationManager: DEBUG: Deleting existing channel 'schemapuls_alerts' with importance X
LocalNotificationManager: DEBUG: ✅ Channel created successfully - ID: schemapuls_alerts, Importance: 4 (HIGH=4), Vibrate: true, Lights: true, Badge: true
```

### On Scheduling:
```
LocalNotificationManager: DEBUG: Scheduling 5 notifications
LocalNotificationManager: DEBUG: Processing notification ID: 12345, Title: Class Name, Scheduled: YES
LocalNotificationManager: DEBUG: Building notification ID: 12345, Channel: schemapuls_alerts
LocalNotificationManager: DEBUG: Scheduling notification ID: 12345 with AlarmManager
LocalNotificationManager: DEBUG: ✅ Exact alarm scheduled (allowWhileIdle) - ID: 12345, Trigger: [timestamp]
```

### On Alarm Firing:
```
TimedNotificationPublisher: Notification fired for ID: 12345
LocalNotificationManager: DEBUG: ✅ Notification posted - ID: 12345, Channel: schemapuls_alerts, Priority: HIGH
```

### On Restore:
```
LocalNotificationRestore: DEBUG: Restore receiver - processing 3 saved notification IDs
LocalNotificationRestore: DEBUG: Deleting past non-repeating notification ID: 12340 (scheduled: [past time], now: [current time])
LocalNotificationRestore: DEBUG: Rescheduling future notification ID: 12345 (scheduled: [future time])
LocalNotificationRestore: DEBUG: Rescheduling 2 valid notifications
```

---

## Known Issues & Workarounds

### Issue: Notifications Don't Fire on Some Samsung Devices
**Solution**: User must disable battery optimization:
1. Settings > Apps > SchemaPuls > Battery > Unrestricted
2. Settings > Device care > Battery > Background app limits > Add to "Never sleeping"

### Issue: Exact Alarms Not Working (Android 12+)
**Solution**: User must grant "Alarms & reminders" permission:
1. Settings > Apps > SchemaPuls > Additional settings > Special app access > Alarms & reminders

### Issue: Channel Importance Still LOW After Update
**Solution**: Fresh install required (uninstall completely, then reinstall) OR:
- User can manually change channel importance in Android Settings > Apps > SchemaPuls > Notifications

---

## Success Criteria Summary

✅ **All tests pass if:**
1. Permission is requested on Android 13+
2. Channel created with IMPORTANCE_HIGH (4)
3. Heads-up notifications appear while app is open
4. Heads-up notifications appear when app is backgrounded
5. Notifications fire at exact scheduled time
6. No duplicate notifications on restore
7. Battery optimization warnings logged correctly
8. All scheduled notifications fire reliably

---

## Rollback Plan

If issues occur:
1. Revert patch: `git checkout android-notifications-clean -- patches/`
2. Remove postinstall script from package.json
3. Reinstall: `npm install`
4. Rebuild: `npx cap sync android`

---

## Notes for Ryan (Principal)

- All debug code is labeled with "DEBUG:" prefix for easy removal later
- The patch file is in `patches/@capacitor+local-notifications+7.0.3.patch`
- Changes will persist after `npm install` due to postinstall script
- If you need to update the plugin version, you'll need to recreate the patch
- Main fixes are in:
  - `LocalNotificationManager.java`: Channel creation, notification building, AlarmManager scheduling
  - `LocalNotificationRestoreReceiver.java`: Prevents duplicate notifications
