# Barakah Hub — APK Build Guide

Two ways to ship an Android APK. Both connect to the same Cloudflare-hosted Next.js backend (`https://barakah-hub.bakerabi91.workers.dev`) and share the same Neon Postgres database with the web app.

## Architecture

```
┌────────────────┐                    ┌──────────────────────────────┐
│  Mobile (APK)  │  REST + JWT/cookie │  Next.js API routes          │
│  Expo / RN     │  ───────────────►  │  /api/* on Cloudflare Worker │
│  React Native  │                    │  Better-Auth + Drizzle ORM   │
└────────────────┘                    └──────────────────┬───────────┘
        ▲                                                 │
        │                              Server Actions     │
        │                                                 ▼
┌────────────────┐                    ┌──────────────────────────────┐
│  Web (browser) │ ◄─── same domain ──┤      Neon Postgres           │
│  Next.js PWA   │                    │      (single source)         │
└────────────────┘                    └──────────────────────────────┘
```

Both surfaces interoperate: a payment recorded via the web admin shows up in the mobile app instantly (and vice versa) since both query the same database.

---

## Recommended path — EAS Build (cloud)

EAS Build runs the build on Expo's servers — no Android Studio needed locally.

### One-time setup

```powershell
cd c:\Users\Uchiha\Desktop\FR\mobile

# 1. Install EAS CLI
npm install -g eas-cli

# 2. Log in (uses your Expo account — sign up at expo.dev if needed)
eas login

# 3. Link this project to an EAS project
eas init
```

### Build the APK (preview profile — points at production API)

```powershell
eas build --profile preview --platform android
```

Output: a downloadable `.apk` link in the terminal once the cloud build finishes (~10–15 min). The preview profile uses `buildType: apk` and the production API URL — perfect for sideloading and testing.

### Build for Play Store (app-bundle)

```powershell
eas build --profile production --platform android
```

Output: an `.aab` Android App Bundle, which is what the Google Play Console accepts.

---

## Alternative path — local APK build

Requires Android Studio with SDK 35, Java 17, and a lot of disk space.

```powershell
# Generates android/ folder once (do this only once)
npx expo prebuild --platform android

# Build the APK locally
cd android
.\gradlew assembleRelease

# APK lands at: android/app/build/outputs/apk/release/app-release.apk
```

---

## Before the first APK can connect

The mobile app reads `EXPO_PUBLIC_API_URL` at build time from `eas.json`. The `preview` and `production` profiles both point at:

```
https://barakah-hub.bakerabi91.workers.dev
```

For that URL to actually serve the API, the Next.js app must be deployed first:

1. **GitHub Secrets** (Settings → Secrets → Actions):
   - `CLOUDFLARE_API_TOKEN` — create at dash.cloudflare.com → My Profile → API Tokens
   - `CLOUDFLARE_ACCOUNT_ID` = `bakerabi91`
   - `BETTER_AUTH_SECRET` (read from `next-app/.env.local`)

2. **Worker Secrets** (one-time):
   ```powershell
   cd ..\next-app
   pnpm wrangler login
   pnpm wrangler secret put DATABASE_URL
   pnpm wrangler secret put BETTER_AUTH_SECRET
   ```

3. **Push to main** — GitHub Actions `deploy.yml` auto-deploys.

4. **Verify**: `curl https://barakah-hub.bakerabi91.workers.dev/api/me` should return `401` (not network error).

---

## Database migrations

If you've added new tables (e.g. `push_tokens` for push notifications), run the migration on Neon before building the APK:

```powershell
cd ..\next-app
pnpm tsx scripts/migrate.ts
```

Or via Neon's SQL editor, paste `supabase/migrations/0006_push_tokens.sql`.

---

## Feature parity between web and mobile

Both surfaces are kept in sync because they read/write the same database via either server actions (web) or REST routes (mobile). The REST routes call the same `meOrThrow` and Drizzle helpers, so every server-side check (admin role, status === 'approved', UUID guards, TOCTOU-safe updates) applies identically.

| Feature              | Web (next-app)        | Mobile (Expo)              |
|----------------------|-----------------------|----------------------------|
| Login / register     | Better-Auth pages     | `/api/auth/[...all]`       |
| Forgot password      | `/forgot-password`    | POST `/api/auth/forget-password` |
| Dashboard            | RSC `/dashboard`      | GET `/api/dashboard/me`    |
| Fund total + chart   | RSC `/admin/fund`     | GET `/api/dashboard/fund`  |
| Members list / approve| `/admin/members`     | GET `/api/members`, POST `/api/members/:id/approve` |
| Payments verify      | `/admin/fund`         | POST `/api/payments/:id/verify` |
| Submit donation      | `/myaccount` form     | POST `/api/payments/submit` |
| Cases (vote/disburse)| `/cases`              | POST `/api/cases/:id/vote` |
| Loans (issue/repay)  | `/admin/loans`        | POST `/api/loans`, POST `/api/loans/:id/repay` |
| Notifications        | `/notifications`      | GET `/api/notifications`, POST `/api/notifications/read-all` |
| Broadcast (admin)    | `/admin/broadcast`    | POST `/api/admin/broadcast` |
| Push tokens (mobile) | n/a (PWA push)        | POST/DELETE `/api/push-tokens` |
| Camera upload        | `<input file>` (PWA)  | `expo-image-picker`        |
| Biometric login      | WebAuthn (browser)    | `expo-local-authentication` |

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| `EAS init` says project not found | Run `eas init` to create a new EAS project, accept the slug |
| Build fails with `expo-crypto not found` | `npm install expo-crypto` (already added to package.json) |
| APK installs but login fails with "Network error" | Web app not deployed yet — see "Before the first APK can connect" |
| Cookie not stored on Android | Already handled — `axios` sends `Authorization: Bearer <token>` from SecureStore as a fallback |
| Push notifications never arrive | Run the `0006_push_tokens.sql` migration on Neon first |
| `EXPO_PUBLIC_API_URL` not respected | EAS bakes env at build time — rebuild after editing `eas.json` |
