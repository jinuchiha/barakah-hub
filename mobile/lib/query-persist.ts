import { MMKV } from 'react-native-mmkv';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const mmkv = new MMKV({ id: 'bh_query_cache' });

const mmkvAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const v = mmkv.getString(key);
    return v ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    mmkv.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    mmkv.delete(key);
  },
};

export const queryPersister = createAsyncStoragePersister({
  storage: mmkvAdapter,
  key: 'bh_react_query',
  throttleTime: 1000,
});

export function getCacheSize(): number {
  const raw = mmkv.getString('bh_react_query');
  return raw ? new Blob([raw]).size : 0;
}

export function clearQueryCache(): void {
  mmkv.delete('bh_react_query');
}
