import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'bh_session_token';
const USER_KEY = 'bh_user';
const LANG_KEY = 'bh_lang';

export async function saveSessionToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, token);
}

export async function getSessionToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function clearSessionToken(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function saveUser(user: object): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser<T>(): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function clearStoredUser(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function getLanguage(): Promise<string> {
  const lang = await SecureStore.getItemAsync(LANG_KEY);
  return lang ?? 'en';
}

export async function saveLanguage(lang: string): Promise<void> {
  await SecureStore.setItemAsync(LANG_KEY, lang);
}
