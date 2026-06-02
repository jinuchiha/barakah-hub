import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MemberInvite {
  id: string;
  token: string;
  label: string | null;
  maxUses: number;
  usedCount: number;
  revoked: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateInviteInput {
  label?: string;
  maxUses?: number;
  expiresInDays?: number;
}

async function fetchInvites(): Promise<MemberInvite[]> {
  const { data } = await api.get<MemberInvite[]>('/api/invites');
  return data;
}

async function createInvite(input: CreateInviteInput): Promise<MemberInvite> {
  const { data } = await api.post<MemberInvite>('/api/invites', input);
  return data;
}

async function revokeInvite(id: string): Promise<void> {
  await api.delete(`/api/invites/${id}`);
}

export function useInvites() {
  return useQuery({ queryKey: ['invites'], queryFn: fetchInvites, staleTime: 30_000 });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createInvite, onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }) });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: revokeInvite, onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }) });
}

/** Build the public join URL members open to register with an invite token. */
export function inviteUrl(token: string): string {
  const base = process.env.EXPO_PUBLIC_API_URL;
  if (!base) {
    console.warn('[inviteUrl] EXPO_PUBLIC_API_URL not set — invite links will be relative');
  }
  return `${(base ?? '').replace(/\/$/, '')}/join/${token}`;
}
