import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Loan, Repayment } from '@/types';

interface RecordRepaymentInput {
  loanId: string;
  amount: number;
  note?: string;
}

async function fetchMyLoans(): Promise<Loan[]> {
  const { data } = await api.get<Loan[]>('/api/loans/mine');
  return data;
}

async function fetchAllLoans(): Promise<Loan[]> {
  const { data } = await api.get<Loan[]>('/api/loans');
  return data;
}

async function fetchLoanRepayments(loanId: string): Promise<Repayment[]> {
  const { data } = await api.get<Repayment[]>(`/api/loans/${loanId}/repayments`);
  return data;
}

async function recordRepayment(input: RecordRepaymentInput): Promise<void> {
  await api.post(`/api/loans/${input.loanId}/repay`, {
    amount: input.amount,
    note: input.note,
  });
}

export function useMyLoans() {
  return useQuery({
    queryKey: ['loans', 'mine'],
    queryFn: fetchMyLoans,
    staleTime: 60_000,
  });
}

export function useAllLoans() {
  return useQuery({
    queryKey: ['loans', 'all'],
    queryFn: fetchAllLoans,
    staleTime: 30_000,
  });
}

export function useLoanRepayments(loanId: string) {
  return useQuery({
    queryKey: ['loans', loanId, 'repayments'],
    queryFn: () => fetchLoanRepayments(loanId),
    enabled: !!loanId,
  });
}

export function useRecordRepayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: recordRepayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
