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

export interface EditMemberInput {
  id: string;
  nameEn?: string;
  nameUr?: string;
  fatherName?: string;
  fatherDeceased?: boolean;
  phone?: string | null;
  city?: string | null;
  province?: string | null;
  monthlyPledge?: number;
  role?: 'admin' | 'supervisor' | 'member';
  status?: 'pending' | 'approved' | 'rejected';
  spouseId?: string | null;
}

export interface AddMemberInput {
  username: string;
  nameEn: string;
  nameUr: string;
  fatherName: string;
  fatherDeceased?: boolean;
  phone?: string;
  city?: string;
  province?: string;
  monthlyPledge?: number;
}

async function editMember(input: EditMemberInput): Promise<void> {
  const { id, ...rest } = input;
  await api.patch(`/api/members/${id}`, rest);
}

async function addMember(input: AddMemberInput): Promise<Member> {
  const { data } = await api.post<Member>('/api/members', input);
  return data;
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
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

function invalidateMemberQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['members'] });
  qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
}

export function useEditMember() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: editMember, onSuccess: () => invalidateMemberQueries(qc) });
}

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: addMember, onSuccess: () => invalidateMemberQueries(qc) });
}
