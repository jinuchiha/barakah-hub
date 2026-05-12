import { api } from './api';
import type { SupportedLanguage } from './i18n';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
}

const SYSTEM_PROMPT = `You are Barakah Assistant, a helpful AI integrated into Barakah Hub — a family Islamic fund management app. You help users with:

- Zakat calculations and Islamic finance questions
- Understanding Sadaqah and charitable giving
- Qarz-e-Hasana (interest-free loans) guidance
- Navigating the app's features
- General Islamic guidance on family finances

Be respectful, knowledgeable, and concise. Use Islamic greetings naturally. When asked about specific numbers, remind users to check the app's actual data.`;

export function buildSystemPrompt(language: SupportedLanguage): string {
  const langInstructions: Record<SupportedLanguage, string> = {
    en: 'Respond in English.',
    ur: 'اردو میں جواب دیں۔',
    ar: 'أجب باللغة العربية.',
    hi: 'हिंदी में जवाब दें।',
    ps: 'پښتو ژبه کې ځواب ورکه.',
    sd: 'سنڌيءَ ۾ جواب ڏيو.',
  };
  return `${SYSTEM_PROMPT}\n\n${langInstructions[language]}`;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  language: SupportedLanguage,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const response = await api.post<{ content: string }>(
    '/api/ai/chat',
    {
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      systemPrompt: buildSystemPrompt(language),
    },
    { responseType: 'text' },
  );

  const raw = response.data as unknown as string;
  const lines = raw.split('\n').filter(Boolean);

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;
      try {
        const parsed = JSON.parse(data) as { delta?: string };
        if (parsed.delta) onChunk(parsed.delta);
      } catch {
        // skip malformed chunks
      }
    }
  }
}
