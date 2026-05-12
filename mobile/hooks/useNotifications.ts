import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import { useAppStore } from '@/stores/app.store';
import type { Notification } from '@/types';

async function fetchNotifications(): Promise<Notification[]> {
  const { data } = await api.get<Notification[]>('/api/notifications');
  return data;
}

async function markAllRead(): Promise<void> {
  await api.post('/api/notifications/read-all');
}

export function useNotifications() {
  const { setNotificationCount } = useAppStore();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (query.data) {
      const unread = query.data.filter((n) => !n.read).length;
      setNotificationCount(unread);
    }
  }, [query.data, setNotificationCount]);

  const markReadMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      setNotificationCount(0);
    },
  });

  return {
    ...query,
    markAllRead: markReadMutation.mutate,
    isMarkingRead: markReadMutation.isPending,
  };
}
