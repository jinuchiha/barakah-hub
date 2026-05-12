import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { EmergencyCase, CaseStatus, CaseType, FundPool } from '@/types';

interface CreateCaseInput {
  caseType: CaseType;
  pool: FundPool;
  category: string;
  beneficiaryName: string;
  relation?: string;
  city?: string;
  amount: number;
  reasonUr: string;
  reasonEn: string;
  emergency: boolean;
  returnDate?: string;
}

interface CasesFilter {
  status?: CaseStatus;
}

async function fetchCases(filter: CasesFilter): Promise<EmergencyCase[]> {
  const params = filter.status ? { status: filter.status } : {};
  const { data } = await api.get<EmergencyCase[]>('/api/cases', { params });
  return data;
}

async function castVote(input: { caseId: string; yes: boolean }): Promise<void> {
  await api.post(`/api/cases/${input.caseId}/vote`, { yes: input.yes });
}

async function createCase(input: CreateCaseInput): Promise<EmergencyCase> {
  const { data } = await api.post<EmergencyCase>('/api/cases', input);
  return data;
}

export function useCases(filter: CasesFilter = {}) {
  return useQuery({
    queryKey: ['cases', filter.status ?? 'all'],
    queryFn: () => fetchCases(filter),
    staleTime: 30_000,
  });
}

export function useCastVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: castVote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cases'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCase,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cases'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
