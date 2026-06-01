import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MessagePerson {
  id: string;
  nameEn: string;
  nameUr: string;
  color: string;
}

export interface Message {
  id: string;
  fromId: string;
  toId: string;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
  from: MessagePerson | null;
  to: MessagePerson | null;
  incoming: boolean;
}

async function fetchMessages(): Promise<Message[]> {
  const { data } = await api.get<Message[]>('/api/messages');
  return data;
}

async function sendToAdmin(input: { subject: string; body: string }): Promise<void> {
  await api.post('/api/messages/to-admin', input);
}

async function sendMessage(input: { toId: string; subject: string; body: string }): Promise<void> {
  await api.post('/api/messages', input);
}

async function markMessagesRead(): Promise<void> {
  await api.post('/api/messages/read');
}

export function useMessages() {
  return useQuery({ queryKey: ['messages'], queryFn: fetchMessages, staleTime: 20_000 });
}

export function useSendToAdmin() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: sendToAdmin, onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }) });
}

export function useReplyMessage() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: sendMessage, onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }) });
}

export function useMarkMessagesRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: markMessagesRead, onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }) });
}
