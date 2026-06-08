import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSessionToken, clearSessionToken, clearStoredUser } from './storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getSessionToken();
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await clearSessionToken();
      await clearStoredUser();
      // Signal other parts of the app to redirect — they listen via auth store
      // (direct router import would require dynamic import not supported here)
      try {
        const { useAuthStore } = require('@/stores/auth.store');
        useAuthStore.getState().logout();
      } catch {
        // Store not initialized yet — ignore
      }
    }
    return Promise.reject(normalizeError(error));
  },
);

function normalizeError(error: AxiosError): Error {
  if (error.response) {
    const data = error.response.data as Record<string, unknown>;
    const rawMsg = (data?.message ?? data?.error ?? error.message) as string;
    const msg = humanizeAuthError(rawMsg, error.response.status);
    const normalized = new Error(msg);
    (normalized as Error & { status: number }).status = error.response.status;
    return normalized;
  }
  if (error.request) {
    return new Error('Cannot reach server. Check your internet connection.');
  }
  return new Error(error.message);
}

function humanizeAuthError(msg: string, status: number): string {
  const lower = msg?.toLowerCase() ?? '';
  if (lower.includes('invalid email') || lower.includes('user not found') || lower.includes('no user')) {
    return 'No account found with this email.';
  }
  if (lower.includes('invalid password') || lower.includes('incorrect password') || lower.includes('wrong password')) {
    return 'Incorrect password. Please try again.';
  }
  if (lower.includes('email not verified') || lower.includes('not verified')) {
    return 'Please verify your email before signing in.';
  }
  if (lower.includes('account') && lower.includes('pending')) {
    return 'Your account is pending admin approval.';
  }
  if (status === 401) return 'Invalid email or password.';
  if (status === 403) return 'Access denied. Your account may be pending approval.';
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.';
  if (status >= 500) return 'Server error. Please try again in a moment.';
  return msg || 'Something went wrong. Please try again.';
}

export type { AxiosError };
