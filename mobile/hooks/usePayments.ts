import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Payment, FundPool } from '@/types';

interface SubmitDonationInput {
  amount: number;
  pool: FundPool;
  monthLabel: string;
  note?: string;
  receiptUrl?: string;
}

async function fetchMyPayments(): Promise<Payment[]> {
  const { data } = await api.get<Payment[]>('/api/payments/mine');
  return data;
}

async function fetchAllPayments(): Promise<Payment[]> {
  const { data } = await api.get<Payment[]>('/api/payments');
  return data;
}

async function submitDonation(input: SubmitDonationInput): Promise<Payment> {
  const { data } = await api.post<Payment>('/api/payments/submit', input);
  return data;
}

async function verifyPayment(paymentId: string): Promise<void> {
  await api.post(`/api/payments/${paymentId}/verify`);
}

async function rejectPayment(paymentId: string): Promise<void> {
  await api.delete(`/api/payments/${paymentId}`);
}

export function useMyPayments() {
  return useQuery({
    queryKey: ['payments', 'mine'],
    queryFn: fetchMyPayments,
    staleTime: 60_000,
  });
}

export function useAllPayments() {
  return useQuery({
    queryKey: ['payments', 'all'],
    queryFn: fetchAllPayments,
    staleTime: 30_000,
  });
}

export function useSubmitDonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitDonation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useVerifyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: verifyPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRejectPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rejectPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}
