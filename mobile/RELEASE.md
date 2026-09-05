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

Signing: the repo does NOT track android/ (local prebuild artifact only),
so EAS builds run the MANAGED workflow and sign with the EAS-managed
release keystore — generated and stored in the Expo account on the first
build. The local android/ folder's debug-keystore release config never
applies to EAS builds; do not distribute anything built from it.

- QA / direct-install build (signed release APK, production env):
    eas build --platform android --profile preview
- Store build (signed AAB for Play Console):
    eas build --platform android --profile production

Both need one interactive `eas login` first (account: jinuchiha). On the
very first build, answer "yes" to letting EAS generate the keystore, and
never lose that account — it holds the app's signing identity.

Do NOT distribute a debug/development-client build, and do not
re-distribute the old barakah-hub-final.apk (it is debug-signed).

Dependency note: @sentry/react-native must stay on the SDK 52-compatible
line (~6.10.0). `npx expo install --check` guards this; 8.x fails the
native build.

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
