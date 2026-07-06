import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer, username, emailOTP } from 'better-auth/plugins';
import { db } from '@/lib/db';
import { users, sessions, accounts, verifications } from '@/lib/db/schema';
import { sendOtpEmail } from '@/lib/email';

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
    },
  }),

  emailAndPassword: {
    enabled: true,
    // First-login email verification via OTP — but only when Resend can
    // actually deliver codes; without it the gate would lock users out.
    requireEmailVerification: Boolean(process.env.RESEND_API_KEY),
    minPasswordLength: 8,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        console.warn(`[auth] Reset link for ${user.email}: ${url} (Resend not configured)`);
        return;
      }
      const { Resend } = await import('resend');
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: process.env.RESEND_FROM ?? 'Barakah Hub <noreply@barakahhub.app>',
        to: user.email,
        subject: 'Reset your Barakah Hub password',
        text: `Click to reset your password:\n\n${url}\n\nThis link expires in 1 hour.`,
      });
    },
  },

  // Session lasts 30 days, sliding window — refreshed on every request
  // within 7 days of expiry.
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24 * 7,  // refresh if accessed within 7 days of expiry
  },

  // Trusted origins for CORS / CSRF (same-origin in our case).
  trustedOrigins: [baseURL],

  // Brute-force protection. In-memory storage is per-lambda on Vercel, so
  // the cap is per-instance rather than global — still enough to make
  // credential-stuffing impractical without a schema change.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/forget-password': { window: 300, max: 3 },
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
      sendVerificationOnSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        await sendOtpEmail(email, otp, type);
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
