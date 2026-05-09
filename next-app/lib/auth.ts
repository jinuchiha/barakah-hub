import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db';

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

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET ?? 'change-me-via-env',

  database: drizzleAdapter(db, {
    provider: 'pg',
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
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
});

export type Session = typeof auth.$Infer.Session;
