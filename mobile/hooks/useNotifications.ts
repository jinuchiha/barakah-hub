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

async function markOneRead(id: string): Promise<void> {
  await api.post(`/api/notifications/${id}/read`);
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

  // Tap-to-read: flip the row instantly (optimistic) so the badge drops
  // before the server round-trip; reconcile with a refetch afterwards.
  const markOneMutation = useMutation({
    mutationFn: markOneRead,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      qc.setQueryData<Notification[]>(['notifications'], (old) =>
        old?.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      const unread = (qc.getQueryData<Notification[]>(['notifications']) ?? []).filter((n) => !n.read).length;
      setNotificationCount(unread);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return {
    ...query,
    markAllRead: markReadMutation.mutate,
    isMarkingRead: markReadMutation.isPending,
    markOneRead: markOneMutation.mutate,
  };
}
