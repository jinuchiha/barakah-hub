import { useState, useCallback, useRef } from 'react';
import { MMKV } from 'react-native-mmkv';
import type { ChatMessage } from '@/lib/ai';
import { sendChatMessage } from '@/lib/ai';
import type { SupportedLanguage } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth.store';

const storage = new MMKV({ id: 'ai-chat' });
const HISTORY_KEY = 'chat_history';
const MAX_HISTORY = 50;

function loadHistory(): ChatMessage[] {
  try {
    const raw = storage.getString(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages: ChatMessage[]): void {
  const trimmed = messages.slice(-MAX_HISTORY);
  storage.set(HISTORY_KEY, JSON.stringify(trimmed));
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface AIChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
  clearHistory: () => void;
}

export function useAIChat(): AIChatState {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory());
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language } = useAuthStore();
  const streamingRef = useRef<string>('');

  const appendChunk = useCallback((chunk: string) => {
    streamingRef.current += chunk;
    const current = streamingRef.current;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.role !== 'assistant') return prev;
      return [...prev.slice(0, -1), { ...last, content: current }];
    });
  }, []);

  const send = useCallback(async (text: string) => {
    if (isStreaming || !text.trim()) return;
    setError(null);
    setIsStreaming(true);
    streamingRef.current = '';

    const userMsg: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: text.trim(),
      createdAt: Date.now(),
    };

    const assistantMsg: ChatMessage = {
      id: makeId(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };

    const updated = [...messages, userMsg, assistantMsg];
    setMessages(updated);

    try {
      await sendChatMessage(
        [...messages, userMsg],
        (language as SupportedLanguage) ?? 'en',
        appendChunk,
      );
      setMessages((prev) => {
        saveHistory(prev);
        return prev;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
      streamingRef.current = '';
    }
  }, [isStreaming, messages, language, appendChunk]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    storage.delete(HISTORY_KEY);
  }, []);

  return { messages, isStreaming, error, send, clearHistory };
}
