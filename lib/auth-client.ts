'use client';
import { createAuthClient } from 'better-auth/react';

/**
 * Better-Auth client — used in client components for sign-in / sign-up /
 * forgot-password / sign-out.
 *
 * baseURL falls back to the deployed origin in browser context, so the
 * same code works in dev (http://localhost:3000) and production
 * (https://app.barakah-hub.workers.dev) without env-var swizzling.
 *
 * Usage:
 *   import { authClient } from '@/lib/auth-client';
 *   await authClient.signIn.email({ email, password });
 *   await authClient.forgetPassword({ email, redirectTo: '/reset-password' });
 *   await authClient.signOut();
 */
export const authClient = createAuthClient({
  baseURL:
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL,
});

// Re-export the most commonly used pieces so call-sites stay terse.
export const { signIn, signUp, signOut, useSession } = authClient;
