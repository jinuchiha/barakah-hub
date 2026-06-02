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
    config.headers['Cookie'] = `better-auth.session_token=${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await clearSessionToken();
      await clearStoredUser();
    }
    return Promise.reject(normalizeError(error));
  },
);

function normalizeError(error: AxiosError): Error {
  if (error.response) {
    const data = error.response.data as Record<string, unknown>;
    const msg = (data?.message ?? data?.error ?? error.message) as string;
    const normalized = new Error(msg || 'Request failed');
    (normalized as Error & { status: number }).status = error.response.status;
    return normalized;
  }
  if (error.request) {
    return new Error('Network error — please check your connection');
  }
  return new Error(error.message);
}

export type { AxiosError };
