import { getSessionToken } from './storage';
import type { SupportedLanguage } from './i18n';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

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
    ps: 'پښتو ژبه کې ځواب ورکه.',
  };
  return `${SYSTEM_PROMPT}\n\n${langInstructions[language]}`;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  language: SupportedLanguage,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const token = await getSessionToken();
  const res = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      systemPrompt: buildSystemPrompt(language),
    }),
  });

  if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data) as { delta?: string };
        if (parsed.delta) onChunk(parsed.delta);
      } catch {
        // skip malformed chunk
      }
    }
  }
}
