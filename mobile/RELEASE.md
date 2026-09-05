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

## iOS release workflow (prepared — blocked on Apple credentials)

Prerequisites the operator must have:
1. An Apple Developer Program membership (USD 99/yr) on the account that
   will own the app.
2. The bundle id `com.barakah.hub` registered (EAS can do this for you).

Config status (already done in this repo):
- `ios.bundleIdentifier` = com.barakah.hub, `ios.buildNumber` = 2
- All required Info.plist usage strings (camera, photos, Face ID, location)
- Push: iOS APNs key is managed by EAS credentials, same as the Android
  keystore. expo-notifications works once the key exists.

Build commands (run after `npx eas-cli login`):
- TestFlight / App Store archive (IPA):
    npx eas-cli build --platform ios --profile production
  First run walks you through Apple sign-in; EAS creates and stores the
  distribution certificate + provisioning profile in your Expo account.
- Submit the finished build to App Store Connect:
    npx eas-cli submit --platform ios
- Internal-device build (ad hoc, for QA phones registered on the account):
    add an "internal" ios profile with "distribution": "internal", register
    devices with `npx eas-cli device:create`, then build with that profile.

Sentry: the same SENTRY_DISABLE_AUTO_UPLOAD=true applies until
SENTRY_AUTH_TOKEN is configured.

Reality check: an IPA cannot be produced without the Apple account — there
is no keystore-style workaround. Everything up to that gate is committed
and ready.
