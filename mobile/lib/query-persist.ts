import { MMKV } from 'react-native-mmkv';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

/**
 * Persisted react-query cache. The cache holds financial + PII data
 * (payments, loans, members, cases), so the MMKV store is ENCRYPTED with a
 * per-install key kept in SecureStore. The key is created lazily on first
 * launch; the persister is built asynchronously (see initQueryPersister).
 */
const ENC_KEY_NAME = 'bh_query_cache_key';
const CACHE_KEY = 'bh_react_query';

let mmkv: MMKV | null = null;

async function getEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(ENC_KEY_NAME);
  if (!key) {
    const bytes = Crypto.getRandomBytes(16);
    key = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(ENC_KEY_NAME, key);
  }
  return key;
}

export async function initQueryPersister() {
  const encryptionKey = await getEncryptionKey();
  mmkv = new MMKV({ id: 'bh_query_cache', encryptionKey });

  const adapter = {
    getItem: async (key: string): Promise<string | null> => mmkv!.getString(key) ?? null,
    setItem: async (key: string, value: string): Promise<void> => mmkv!.set(key, value),
    removeItem: async (key: string): Promise<void> => mmkv!.delete(key),
  };

  return createAsyncStoragePersister({
    storage: adapter,
    key: CACHE_KEY,
    throttleTime: 1000,
  });
}

export function getCacheSize(): number {
  const raw = mmkv?.getString(CACHE_KEY);
  return raw ? new Blob([raw]).size : 0;
}

export function clearQueryCache(): void {
  mmkv?.delete(CACHE_KEY);
}
