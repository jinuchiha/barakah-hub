import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { EmergencyCase, CaseStatus, CaseType, FundPool } from '@/types';

/**
 * New shape: one `reason` field. Server fans it into both legacy
 * reasonEn / reasonUr columns and defaults category to "general".
 */
interface CreateCaseInput {
  caseType: CaseType;
  pool: FundPool;
  beneficiaryName: string;
  relation?: string;
  city?: string;
  amount: number;
  reason: string;
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

async function adminResolveCase(input: { caseId: string; decision: 'approved' | 'rejected' }): Promise<void> {
  await api.post(`/api/cases/${input.caseId}/resolve`, { decision: input.decision });
}

async function deleteCase(caseId: string): Promise<void> {
  await api.delete(`/api/cases/${caseId}`);
}

function invalidateCaseQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['cases'] });
  qc.invalidateQueries({ queryKey: ['dashboard'] });
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
  return useMutation({ mutationFn: castVote, onSuccess: () => invalidateCaseQueries(qc) });
}

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createCase, onSuccess: () => invalidateCaseQueries(qc) });
}

export function useAdminResolveCase() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: adminResolveCase, onSuccess: () => invalidateCaseQueries(qc) });
}

export function useDeleteCase() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: deleteCase, onSuccess: () => invalidateCaseQueries(qc) });
}
