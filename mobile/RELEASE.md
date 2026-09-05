# Android release — v1.1.0 (versionCode 2)

This release adds a NATIVE module (@sentry/react-native): it CANNOT ship as
an OTA update. A new signed build is required. runtimeVersion policy is
`appVersion`, so 1.0.0 binaries will not receive 1.1.0 JS bundles — correct.

## Preflight (operator)
1. `npx expo-doctor` and `npx expo install --check` — resolve anything red.
2. EAS env (project → Environment variables / secrets):
   - `EXPO_PUBLIC_API_URL` = production web origin (already in eas.json)
   - `EXPO_PUBLIC_SENTRY_DSN` = mobile Sentry DSN
   - `SENTRY_AUTH_TOKEN` (optional, for symbolicated stack traces)
   - Replace `SENTRY_ORG_PLACEHOLDER` in app.json's sentry plugin config.
3. Signing: EAS manages the keystore (`eas credentials`). NEVER commit one.

## Builds
- QA build (installable APK, production env):
    eas build --platform android --profile preview
- Store build (AAB for Play Console):
    eas build --platform android --profile production
  For a direct-distribution SIGNED APK instead of an AAB, temporarily use
  the preview profile (buildType apk) — it signs with the same credentials.

Do NOT distribute a debug/development-client build.

## Physical-device test matrix (before release)
fresh install · upgrade install over 1.0.0 · signup → pending state · login ·
email OTP · biometric unlock · PIN unlock + 5-failure timed lockout + retry
after backoff · payment submit with receipt photo (verify the receipt opens
in the in-app viewer, NOT the browser) · push notification received in
foreground / background / terminated (real device — emulators lie) ·
cold-start notification tap routes correctly · deep link from WhatsApp ·
logout kills the session · airplane-mode submit queues/fails visibly ·
Android back never traps · forced test crash appears in Sentry dashboard.

## Post-release
- Watch Sentry for the release `barakah-mobile@1.1.0`.
- OTA (JS-only) fixes may use `eas update` on the 1.1.0 runtime; anything
  touching native modules bumps versionCode again.
