import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useAppStore } from '@/stores/app.store';

let unsubscribe: (() => void) | null = null;

export function startNetworkListener(): void {
  if (unsubscribe) return;

  const { setNetworkConnected } = useAppStore.getState();

  unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const connected = state.isConnected === true && state.isInternetReachable !== false;
    setNetworkConnected(connected);
  });
}

export function stopNetworkListener(): void {
  unsubscribe?.();
  unsubscribe = null;
}

export async function getNetworkState(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function isOnline(): boolean {
  return useAppStore.getState().isNetworkConnected;
}
