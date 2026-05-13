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

export async function signUp(input: SignUpInput): Promise<void> {
  await api.post('/api/auth/sign-up/email', {
    email: input.email,
    password: input.password,
    name: input.name,
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
