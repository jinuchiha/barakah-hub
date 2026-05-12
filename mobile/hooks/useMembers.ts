import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Member } from '@/types';

async function fetchMembers(): Promise<Member[]> {
  const { data } = await api.get<Member[]>('/api/members');
  return data;
}

async function fetchMember(id: string): Promise<Member> {
  const { data } = await api.get<Member>(`/api/members/${id}`);
  return data;
}

async function approveMember(memberId: string): Promise<void> {
  await api.post(`/api/members/${memberId}/approve`);
}

async function rejectMember(memberId: string): Promise<void> {
  await api.post(`/api/members/${memberId}/reject`);
}

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: fetchMembers,
    staleTime: 60_000,
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: () => fetchMember(id),
    enabled: !!id,
  });
}

export function useApproveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveMember,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export function useRejectMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rejectMember,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
    },
  });
}
