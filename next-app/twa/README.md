# Barakah Hub — Android APK (TWA)

This folder configures the Android Trusted Web Activity (TWA) wrapper. The
APK loads the deployed Cloudflare URL inside a Chrome-powered shell — the
web app and the APK share the same backend automatically, no separate code.

## What ships in the APK

- Full Next.js app rendered from `https://barakah-hub.bakerabi91.workers.dev`
- Camera, file upload (via `<input type="file" capture>`), WebAuthn / biometric login, Web Push
- Offline-aware shell (service worker caches static assets + last-seen pages)
- No URL bar, no Chrome chrome — looks like a native app

## One-time setup

### 1. Install prerequisites

```powershell
# Java 17 (Bubblewrap needs JDK 17+)
winget install Microsoft.OpenJDK.17

# Android command-line tools — Bubblewrap will install them on first run
# Or via Android Studio: SDK Manager → SDK Tools → Android SDK Command-line Tools

# Bubblewrap CLI
npm install -g @bubblewrap/cli
```

### 2. Generate the project (first time only)

```powershell
cd c:\Users\Uchiha\Desktop\FR\next-app\twa
bubblewrap init --manifest=./twa-manifest.json
```

Bubblewrap will:
- Ask for the package id (default `app.barakahhub.twa` — accept it)
- Ask for the signing key location and password (save these — needed for every release)
- Print the SHA-256 fingerprint of the signing key → **copy this**

### 3. Add the fingerprint to your Cloudflare deploy

The TWA verifies it's allowed to embed your site by reading
`https://<host>/.well-known/assetlinks.json`. The route exists in the
Next.js app and reads the fingerprint from an env var.

Add as a Worker secret:

```powershell
cd ..
pnpm wrangler secret put ANDROID_APP_SHA256
# Paste: <the SHA-256 from step 2, comma-separated if multiple keys>

pnpm wrangler secret put ANDROID_PACKAGE_NAME
# Paste: app.barakahhub.twa
```

Then redeploy: `pnpm wrangler deploy` (or just push to main — GitHub Actions deploys).

Verify the asset link is reachable:

```powershell
curl https://barakah-hub.bakerabi91.workers.dev/.well-known/assetlinks.json
```

### 4. Build the APK

```powershell
cd twa
bubblewrap build
```

Output: `app-release-signed.apk` (sideloadable) and `app-release-bundle.aab` (Play Store).

### 5. Test on a phone

```powershell
# Plug in phone with USB debugging on
bubblewrap install
```

The first launch will check the asset link. If it shows the URL bar at the
top, the SHA-256 didn't match — re-check the Worker secret value.

### 6. Publish to Play Store (optional)

Upload `app-release-bundle.aab` to https://play.google.com/console/

## Updates

The TWA always loads the latest deployed URL — no need to rebuild the APK
when the web app changes. Only rebuild when:

- Updating the package name, icon, or launcher name
- Adding new TWA features (shortcuts, share target, file handlers)
- Bumping the Android target SDK for Play Store requirements

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| URL bar visible at top of APK | `assetlinks.json` fingerprint mismatch — confirm SHA-256 matches your signing key |
| Install fails on phone | First uninstall any previous version: `adb uninstall app.barakahhub.twa` |
| Push notifications don't arrive | Web Push is not yet wired in the app — phase 6 |
| Camera doesn't open | Chrome on the device needs camera permission; TWA inherits it |
| Offline mode shows blank page | Visit each route once while online so the service worker can cache it |

## Files in this folder

- `twa-manifest.json` — Bubblewrap config (do not edit by hand after `init`)
- `README.md` — this file
- After `bubblewrap init`: `app/`, `gradle/`, `build.gradle`, signing keystore — all gitignored

The keystore (`android.keystore`) MUST be backed up safely — losing it means
you can never publish an update under the same package id.
