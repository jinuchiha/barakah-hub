import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FundPool } from '@/types';

interface MaskedMember { id: string; nameEn: string; nameUr: string; color: string }

export interface CommunityPayment {
  id: string;
  amount: number;
  pool: FundPool;
  monthLabel: string;
  createdAt: string;
  member: MaskedMember | null;
}

interface CommunityResponse {
  payments: CommunityPayment[];
}

async function fetchCommunity(): Promise<CommunityResponse> {
  const { data } = await api.get<CommunityResponse>('/api/dashboard/community');
  return data;
}

/** Recent community donations (donor identity masked server-side for the
 *  sadaqah/zakat privacy principle). Mirrors the web "Community Activity". */
export function useCommunity() {
  return useQuery({ queryKey: ['dashboard', 'community'], queryFn: fetchCommunity, staleTime: 30_000 });
}
