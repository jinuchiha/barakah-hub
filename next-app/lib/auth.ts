import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer, username, emailOTP } from 'better-auth/plugins';
import { db } from '@/lib/db';
import { users, sessions, accounts, verifications, rateLimits } from '@/lib/db/schema';
import { sendOtpEmail, sendResetPasswordEmail } from '@/lib/email';

/**
 * Better-Auth server instance for Barakah Hub.
 *
 * Tables: users, sessions, accounts, verifications (see lib/db/schema.ts).
 *
 * Email transport (Resend) is wired up only when RESEND_API_KEY is set;
 * otherwise password-reset is a no-op and the admin must reset accounts
 * by deleting + re-creating the member record.
 */

const baseURL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.BETTER_AUTH_URL ??
  'http://localhost:3000';

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret === 'change-me-via-env' || secret.length < 32) {
  throw new Error(
    'BETTER_AUTH_SECRET is not set or is too short (need ≥32 chars). ' +
    'Generate one with `openssl rand -base64 32` and set it in .env.local + Worker secrets.',
  );
}

export const auth = betterAuth({
  baseURL,
  secret,

  database: drizzleAdapter(db, {
    provider: 'pg',
    // Our tables are plural (users, sessions, ...) — Better-Auth's default
    // convention is singular. Map them explicitly.
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      rateLimit: rateLimits,
    },
  }),

  emailAndPassword: {
    enabled: true,
    // Email-OTP verification is OPT-IN via env. Without a verified
    // sender domain, Resend only delivers to the account owner, so a
    // mandatory gate locks every other family member out at signup.
    // Admin approval of the member row is the real admission gate; flip
    // this on (REQUIRE_EMAIL_VERIFICATION=true) only once a dedicated
    // sender domain is verified in Resend.
    requireEmailVerification:
      process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && Boolean(process.env.RESEND_API_KEY),
    minPasswordLength: 8,
    autoSignIn: true,
    // The URL is a live account-takeover capability. sendResetPasswordEmail
    // guarantees it is never logged — when Resend is unconfigured it skips
    // delivery with a non-PII warning instead of printing the link.
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url);
    },
    // A password reset means the credential may have been compromised.
    // Every existing session (web cookie AND mobile bearer token) dies with
    // the old password; the attacker cannot ride out a stolen session.
    revokeSessionsOnPasswordReset: true,
  },

  // Session lasts 30 days, sliding window — refreshed on every request
  // within 7 days of expiry.
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24 * 7,  // refresh if accessed within 7 days of expiry
  },

  // Trusted origins for CORS / CSRF (same-origin in our case).
  trustedOrigins: [baseURL],

  // Brute-force protection, enforced globally via the rate_limits table.
  rateLimit: {
    enabled: true,
    // DATABASE, not memory — Vercel runs many concurrent lambdas and an
    // in-memory counter is per-instance, which multiplies every cap by the
    // number of warm instances. One Neon row per (ip, path) makes it global.
    storage: 'database',
    modelName: 'rateLimit',
    window: 60,
    max: 30,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-in/username': { window: 60, max: 5 },
      '/forget-password': { window: 300, max: 3 },
      // Unauthenticated + sends a real email — the tightest cap, or an
      // attacker can inbox-bomb any address and burn the Resend quota.
      '/email-otp/send-verification-otp': { window: 300, max: 3 },
    },
  },

  // bearer   — mobile app sends `Authorization: Bearer <token>`
  // username — login accepts the family username as well as email
  // emailOTP — 6-digit first-login verification codes via Resend
  plugins: [
    bearer(),
    username({ minUsernameLength: 2, maxUsernameLength: 40 }),
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      // A 6-digit code has a million combinations; without an attempt cap
      // the 10-minute validity window is enough to brute-force one online.
      // Five wrong guesses invalidates the code — request a fresh one.
      allowedAttempts: 5,
      sendVerificationOnSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        await sendOtpEmail(email, otp, type);
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
