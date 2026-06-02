# Barakah Hub - APK Build Guide

This folder contains everything to build the Android APK.

## QUICK START (1 command)

Open **PowerShell as Administrator**, then:

```powershell
cd C:\Users\Uchiha\Desktop\FR\mobile
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\build-apk.ps1
```

That's it. Wait 20-40 minutes. The APK appears on your **Desktop** as `BarakahHub.apk`.

---

## WHAT THE SCRIPT DOES

1. Downloads Android command-line tools from Google (~150 MB)
2. Installs Android SDK 34 + build tools (~500 MB)
3. Sets `ANDROID_HOME` permanently in your user environment
4. Creates a release signing keystore
5. Builds the production-signed APK
6. Copies the APK to your Desktop

## SYSTEM REQUIREMENTS

| Component | Required | Status |
|-----------|----------|--------|
| Windows   | 10 or 11 | OK     |
| Java JDK  | 17+      | OK (Microsoft JDK 17.0.18 detected) |
| Node.js   | 18+      | OK (v22.16.0 detected) |
| Disk      | ~2 GB free | Check yourself |
| Internet  | Stable broadband | Required for SDK download |

## INSTALL THE APK ON YOUR PHONE

### Method 1: File Transfer (easiest)
1. Copy `BarakahHub.apk` from your Desktop to your phone
   - USB cable, Bluetooth, Google Drive, WhatsApp Web, or email
2. On your phone, open **Settings - Apps - Special access - Install unknown apps**
3. Enable for your file manager / browser
4. Tap `BarakahHub.apk` on your phone
5. Tap **Install**
6. Open **Barakah Hub** from your app drawer

### Method 2: ADB (developer mode)
1. On phone: **Settings - About phone - Tap "Build number" 7 times**
2. Go to **Settings - Developer options - Enable USB Debugging**
3. Connect phone to PC via USB cable
4. Open PowerShell and run:
   ```powershell
   C:\Android\sdk\platform-tools\adb.exe install "$env:USERPROFILE\Desktop\BarakahHub.apk"
   ```

## TROUBLESHOOTING

### Build fails with "SDK location not found"
Restart PowerShell and re-run the script. The first run sets environment variables that the second run can read.

### Build fails with "Java version mismatch"
Your project needs Java 17. Check with `java -version`. If you have a different version, install Microsoft JDK 17 from https://learn.microsoft.com/en-us/java/openjdk/download

### "execution of scripts is disabled on this system"
Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Build extremely slow
- Close VS Code / heavy apps to free RAM
- The first build is always slow (Gradle downloads dependencies)
- Subsequent builds are 5-10x faster

### "Out of memory" during build
Edit `android/gradle.properties` and change:
```
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

## REBUILD AFTER CHANGES

If you make code changes and want to rebuild:

```powershell
cd C:\Users\Uchiha\Desktop\FR\mobile\android
.\gradlew.bat assembleRelease
```

The APK output will be at:
```
android\app\build\outputs\apk\release\app-release.apk
```

## RELEASE KEYSTORE

The script creates a development keystore at:
```
android\app\release.keystore
```

**Keep this file safe!** If you publish to Google Play, you'll need it for all future updates.

- Keystore password: `barakah123`
- Key alias: `barakah`
- Key password: `barakah123`

For production, change these passwords in `android\gradle.properties` and regenerate the keystore.

## APP CONFIGURATION

The APK connects to the backend at:
```
https://barakah-hub.bakerabi91.workers.dev
```

To change this, edit `eas.json` under `build.preview.env.EXPO_PUBLIC_API_URL` and rebuild.

## SIZE OPTIMIZATION (optional)

To reduce APK size from ~80MB to ~25MB, the script could be modified to use AAB (App Bundle) split by architecture. For now, the APK is a "universal" build that runs on all devices.

## QUESTIONS?

Check the agent log or re-run the script. Most failures are network-related and resolve on retry.
