import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FundSummary, Payment, Member } from '@/types';
import type { ActivityItem } from '@/components/ActivityFeed';

interface DashboardData {
  fund: FundSummary;
  myCurrentMonth: Payment | null;
  recentActivity: ActivityItem[];
}

async function fetchDashboard(): Promise<DashboardData> {
  const [fundRes, meRes] = await Promise.all([
    api.get<{ sadaqah: number; zakat: number; qarz: number; pendingCount: number }>('/api/dashboard/fund'),
    api.get<{ member: Member; currentMonthPayment: Payment | null; recentActivity: ActivityItem[] }>('/api/dashboard/me'),
  ]);

  return {
    fund: fundRes.data,
    myCurrentMonth: meRes.data.currentMonthPayment,
    recentActivity: meRes.data.recentActivity,
  };
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    // refetchInterval owns freshness — staleTime=Infinity prevents focus
    // refetches from duplicating the 15s poll.
    staleTime: Infinity,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
  });
}
