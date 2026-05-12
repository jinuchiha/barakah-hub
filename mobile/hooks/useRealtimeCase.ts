import { useQuery } from '@tanstack/react-query';
import { useSmartPolling } from '@/lib/realtime';
import { api } from '@/lib/api';
import type { EmergencyCase } from '@/types';

async function fetchCase(id: string): Promise<EmergencyCase> {
  const { data } = await api.get<EmergencyCase>(`/api/cases/${id}`);
  return data;
}

export function useRealtimeCase(id: string) {
  const queryKey = ['case', id];

  useSmartPolling({
    queryKey,
    intervalFocused: 5000,
    intervalBackground: 30000,
    enabled: !!id,
  });

  return useQuery({
    queryKey,
    queryFn: () => fetchCase(id),
    enabled: !!id,
    staleTime: 4000,
  });
}
