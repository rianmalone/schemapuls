package app.lovable.klasspuls

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    private val TAG = "MainActivity"
    private val CHANNEL_ID = "schemapuls_alerts"
    private val CHANNEL_NAME = "SchemaPuls Alerts"
    private val POST_NOTIFICATIONS_PERMISSION_REQUEST_CODE = 1000

    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Log all existing notification channels (DEBUG)
        logExistingChannels()
        
        // Create/recreate notification channel with HIGH importance
        createNotificationChannel()
        
        // Request POST_NOTIFICATIONS permission for Android 13+ (SDK >= 33)
        requestNotificationPermission()
        
        // DEBUG: Send test notification after a short delay
        // This helps verify the channel and permission setup is working
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            sendDebugTestNotification()
        }, 2000) // 2 seconds delay to allow app to initialize
    }
    
    /**
     * Log all existing notification channels (DEBUG)
     * This helps verify Android is using the correct channel
     */
    private fun logExistingChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channels = notificationManager.notificationChannels
            
            Log.d(TAG, "===== EXISTING NOTIFICATION CHANNELS (DEBUG) =====")
            Log.d(TAG, "Total channels found: ${channels.size}")
            
            channels.forEach { channel ->
                val importance = when (channel.importance) {
                    NotificationManager.IMPORTANCE_HIGH -> "HIGH"
                    NotificationManager.IMPORTANCE_DEFAULT -> "DEFAULT"
                    NotificationManager.IMPORTANCE_LOW -> "LOW"
                    NotificationManager.IMPORTANCE_MIN -> "MIN"
                    NotificationManager.IMPORTANCE_NONE -> "NONE"
                    else -> "UNKNOWN (${channel.importance})"
                }
                
                Log.d(TAG, "Channel ID: ${channel.id}")
                Log.d(TAG, "  Name: ${channel.name}")
                Log.d(TAG, "  Importance: $importance")
                Log.d(TAG, "  Can show badge: ${channel.canShowBadge()}")
                Log.d(TAG, "  Enable lights: ${channel.shouldShowLights()}")
                Log.d(TAG, "  Enable vibration: ${channel.shouldVibrate()}")
                Log.d(TAG, "  Sound: ${channel.sound}")
                Log.d(TAG, "  ---")
            }
            Log.d(TAG, "================================================")
        } else {
            Log.d(TAG, "Android version < 8.0, notification channels not supported")
        }
    }
    
    /**
     * Create/recreate notification channel with HIGH importance
     * IMPORTANT: Delete existing channel first if it exists (low importance channels cannot be upgraded)
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // ⚠️ IMPORTANT (DEV ONLY): Delete existing channel first so new importance applies
            try {
                val existingChannel = notificationManager.getNotificationChannel(CHANNEL_ID)
                if (existingChannel != null) {
                    Log.d(TAG, "⚠️ Deleting existing channel '${CHANNEL_ID}' with importance ${existingChannel.importance}")
                    notificationManager.deleteNotificationChannel(CHANNEL_ID)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error deleting existing channel", e)
            }
            
            // Create new channel with HIGH importance
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                // Enable vibration
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 250, 250)
                
                // Enable lights
                enableLights(true)
                lightColor = android.graphics.Color.BLUE
                
                // Enable badge
                setShowBadge(true)
                
                // Set default notification sound
                setSound(
                    android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION),
                    null
                )
                
                // Set description
                description = "Alerts and reminders for your classes"
            }
            
            notificationManager.createNotificationChannel(channel)
            Log.d(TAG, "✅ Created notification channel '$CHANNEL_ID' with IMPORTANCE_HIGH")
            Log.d(TAG, "   - Vibration: enabled")
            Log.d(TAG, "   - Lights: enabled")
            Log.d(TAG, "   - Badge: enabled")
            Log.d(TAG, "   - Sound: default notification sound")
        } else {
            Log.d(TAG, "Android version < 8.0, notification channel not needed")
        }
    }
    
    /**
     * Request POST_NOTIFICATIONS permission for Android 13+ (SDK >= 33)
     */
    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val permission = Manifest.permission.POST_NOTIFICATIONS
            
            when {
                ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED -> {
                    Log.d(TAG, "✅ POST_NOTIFICATIONS permission already granted")
                }
                ActivityCompat.shouldShowRequestPermissionRationale(this, permission) -> {
                    Log.d(TAG, "⚠️ POST_NOTIFICATIONS permission should show rationale")
                    // Show rationale if needed, then request permission
                    ActivityCompat.requestPermissions(
                        this,
                        arrayOf(permission),
                        POST_NOTIFICATIONS_PERMISSION_REQUEST_CODE
                    )
                }
                else -> {
                    Log.d(TAG, "🔔 Requesting POST_NOTIFICATIONS permission")
                    ActivityCompat.requestPermissions(
                        this,
                        arrayOf(permission),
                        POST_NOTIFICATIONS_PERMISSION_REQUEST_CODE
                    )
                }
            }
        } else {
            Log.d(TAG, "Android version < 13 (SDK < 33), POST_NOTIFICATIONS permission not needed")
        }
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == POST_NOTIFICATIONS_PERMISSION_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "✅ POST_NOTIFICATIONS permission granted by user")
            } else {
                Log.w(TAG, "❌ POST_NOTIFICATIONS permission denied by user")
            }
        }
    }
    
    /**
     * DEBUG: Send a test notification immediately using the configured channel
     * This helps verify the channel + permission setup is correct
     * Can be triggered on app start or via a button
     * Labeled clearly as DEBUG so it can be removed later
     */
    private fun sendDebugTestNotification() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val hasPermission = ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
                
                if (!hasPermission) {
                    Log.w(TAG, "⚠️ DEBUG: Cannot send test notification - POST_NOTIFICATIONS permission not granted")
                    return
                }
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // Build notification with heads-up settings
            // Try to use app icon first, fallback to system icon if not available
            val smallIconId = try {
                val iconId = resources.getIdentifier("ic_stat_icon_config_sample", "drawable", packageName)
                if (iconId != 0) iconId else android.R.drawable.ic_dialog_info
            } catch (e: Exception) {
                android.R.drawable.ic_dialog_info
            }
            
            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("🔔 DEBUG: Test Notification")
                .setContentText("If you see this, heads-up notifications are working!")
                .setSmallIcon(smallIconId) // Use app icon if available, otherwise system icon
                .setPriority(NotificationCompat.PRIORITY_HIGH) // Required for heads-up
                .setDefaults(NotificationCompat.DEFAULT_ALL) // Sound, vibration, lights
                .setAutoCancel(true) // Auto-dismiss when tapped
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC) // Show on lock screen
                .setCategory(NotificationCompat.CATEGORY_ALARM) // Help Android treat as important
                .setStyle(NotificationCompat.BigTextStyle()
                    .bigText("This is a DEBUG test notification to verify heads-up notifications are working correctly. Channel: $CHANNEL_ID"))
                .build()
            
            // Use a unique ID for debug notification (negative to avoid conflicts with real notifications)
            val debugNotificationId = -9999
            
            notificationManager.notify(debugNotificationId, notification)
            Log.d(TAG, "✅ DEBUG: Test notification sent successfully (ID: $debugNotificationId)")
            Log.d(TAG, "   Channel: $CHANNEL_ID")
            Log.d(TAG, "   Priority: HIGH")
            Log.d(TAG, "   This notification should appear as a heads-up popup")
        } catch (e: Exception) {
            Log.e(TAG, "❌ DEBUG: Error sending test notification", e)
        }
    }
}
