# iOS Permissions Setup for Camera

The app needs camera and photo library permissions to work. You need to add these to your `Info.plist` file in your iOS project.

## Steps:

1. Open your iOS project in Xcode
2. Find the `Info.plist` file (usually in the `ios/App/App/Info.plist` path)
3. Add the following keys (or update if they exist):

### Required Permissions:

Add these TWO keys to your Info.plist:

1. **NSCameraUsageDescription**
   - Key: `NSCameraUsageDescription`
   - Type: String
   - Value: `"We need access to your camera to take photos of your schedule"`

2. **NSPhotoLibraryUsageDescription**
   - Key: `NSPhotoLibraryUsageDescription`
   - Type: String
   - Value: `"We need access to your photo library to select schedule images"`

**Note:** We do NOT need `NSPhotoLibraryAddUsageDescription` since the app only reads/selects images, it doesn't save them.

**Files App Access:** The Files app access (for uploading from Files) works through iOS system dialogs and doesn't require additional permissions - the file input handles this automatically.

## Alternative: Edit Info.plist as XML

If you prefer editing the XML directly, add these entries inside the `<dict>` tag:

```xml
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to take photos of your schedule</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to select schedule images</string>
```

After adding these, rebuild your app and the permissions should work correctly.

