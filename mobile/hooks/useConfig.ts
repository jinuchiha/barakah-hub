import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface FundConfig {
  voteThresholdPct?: number;
  defaultMonthlyPledge?: number;
  goalAmount?: number;
  goalLabelEn?: string | null;
  goalLabelUr?: string | null;
  easyPaiseName?: string | null;
  easyPaiseNumber?: string | null;
}

async function fetchConfig(): Promise<FundConfig> {
  const { data } = await api.get<FundConfig>('/api/config');
  return data;
}

/** Fund configuration including EasyPaisa collection details. */
export function useConfig() {
  return useQuery({ queryKey: ['config'], queryFn: fetchConfig, staleTime: 5 * 60_000 });
}
