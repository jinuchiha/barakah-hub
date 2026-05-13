import { api } from './api';
import { saveSessionToken, clearSessionToken, saveUser, clearStoredUser } from './storage';
import type { Session, MemberWithSession } from '@/types';

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  monthlyPledge?: number;
  joinCode?: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export async function signIn(input: SignInInput): Promise<MemberWithSession> {
  const { data } = await api.post<Session>('/api/auth/sign-in/email', {
    email: input.email,
    password: input.password,
  });

  if (data.session?.token) {
    await saveSessionToken(data.session.token);
  }

  const member = await fetchMyMember();
  await saveUser({ ...member, email: data.user.email });
  return { ...member, email: data.user.email };
}

/**
 * Sign up + auto-onboard.
 *
 * The signup flow has two halves:
 *  1. Better-Auth /sign-up/email creates a `users` row with credentials.
 *     With autoSignIn=true (set in lib/auth.ts), this also sets the
 *     session cookie / returns a bearer token.
 *  2. /api/onboarding/mobile creates the `members` row with
 *     status='pending' so admins see the request in /admin/members.
 *
 * Without step 2, users got stuck as Better-Auth "orphans" — they had
 * credentials but never appeared in the admin panel. Three real users
 * hit this in May 2026 before we wired the auto-onboarding call.
 *
 * The onboarding call is best-effort: if it fails, we still return
 * (the user has credentials and can retry via Edit Profile / a future
 * onboarding screen). A toast in the caller surfaces the error.
 */
export async function signUp(input: SignUpInput): Promise<void> {
  const { data } = await api.post<Session>('/api/auth/sign-up/email', {
    email: input.email,
    password: input.password,
    name: input.name,
  });

  // autoSignIn is enabled server-side — capture the token so the
  // follow-up onboarding request is authenticated.
  if (data?.session?.token) {
    await saveSessionToken(data.session.token);
  }

  // Create the members row — idempotent server-side, safe to retry.
  await api.post('/api/onboarding/mobile', {
    nameEn: input.name,
    nameUr: input.name,
    phone: input.phone,
    monthlyPledge: input.monthlyPledge,
  });
}

export async function signOut(): Promise<void> {
  try {
    await api.post('/api/auth/sign-out');
  } catch {
    // ignore — clear local state regardless
  }
  await clearSessionToken();
  await clearStoredUser();
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  await api.post('/api/auth/forget-password', {
    email: input.email,
    redirectTo: `${process.env.EXPO_PUBLIC_API_URL}/reset-password`,
  });
}

export async function getSession(): Promise<Session | null> {
  try {
    const { data } = await api.get<Session>('/api/auth/get-session');
    return data;
  } catch {
    return null;
  }
}

export async function fetchMyMember(): Promise<MemberWithSession> {
  const { data } = await api.get<MemberWithSession>('/api/me');
  return data;
}

export interface UpdateProfileInput {
  nameEn?: string;
  nameUr?: string;
  phone?: string | null;
  city?: string | null;
  province?: string | null;
  color?: string;
  photoUrl?: string | null;
}

export async function updateProfile(input: UpdateProfileInput): Promise<MemberWithSession> {
  const { data } = await api.patch<MemberWithSession>('/api/me', input);
  return data;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}

/**
 * Better-Auth's built-in change-password endpoint. Validates the current
 * password server-side and bcrypt-hashes the new one. When
 * revokeOtherSessions=true, all OTHER active sessions are invalidated
 * (web sign-ins, other devices) but this device stays signed in.
 */
export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await api.post('/api/auth/change-password', {
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
    revokeOtherSessions: input.revokeOtherSessions ?? false,
  });
}
