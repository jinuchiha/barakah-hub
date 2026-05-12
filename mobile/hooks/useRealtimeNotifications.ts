import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSmartPolling } from '@/lib/realtime';
import { useAppStore } from '@/stores/app.store';
import { api } from '@/lib/api';

interface UnreadCount {
  count: number;
}

async function fetchUnreadCount(): Promise<UnreadCount> {
  const { data } = await api.get<UnreadCount>('/api/notifications/unread-count');
  return data;
}

export function useRealtimeNotifications(): void {
  const { setNotificationCount } = useAppStore();
  const queryKey = ['notifications', 'unread-count'];

  useSmartPolling({
    queryKey,
    intervalFocused: 10000,
    intervalBackground: 60000,
  });

  const { data } = useQuery({
    queryKey,
    queryFn: fetchUnreadCount,
    staleTime: 9000,
  });

  useEffect(() => {
    if (data?.count !== undefined) {
      setNotificationCount(data.count);
    }
  }, [data, setNotificationCount]);
}
