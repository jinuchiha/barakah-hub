import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

/**
 * Catch-all auth route — Better-Auth handles all `/api/auth/*` paths
 * (sign-in, sign-up, sign-out, callback, reset-password, etc.) here.
 */
export const { GET, POST } = toNextJsHandler(auth);
