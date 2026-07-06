'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'What is my Zakat?',
  'How does Qarz-e-Hasana work?',
  'Show fund summary',
];

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 px-1">
      <BotAvatar />
      <div
        className="flex items-center gap-1 rounded-2xl rounded-bl-sm px-4 py-3"
        style={{ background: 'rgba(200,155,60,0.08)', border: '1px solid rgba(200,155,60,0.14)' }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-1.5 w-1.5 rounded-full bg-[var(--color-gold)]"
            style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

function BotAvatar() {
  return (
    <div
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
      style={{ background: 'linear-gradient(135deg,#c89b3c,#8b6ec9)' }}
    >
      <Bot className="size-3.5 text-[#0a0f1a]" />
    </div>
  );
}

function MessageBubble({ msg, isLive }: { msg: Message; isLive: boolean }) {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex items-end gap-2 px-1', isUser && 'flex-row-reverse')}>
      {!isUser && <BotAvatar />}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed',
          isUser
            ? 'rounded-br-sm text-[var(--color-cream)]'
            : 'rounded-bl-sm text-[var(--color-cream)]',
        )}
        style={
          isUser
            ? { background: 'linear-gradient(135deg,rgba(200,155,60,0.22),rgba(200,155,60,0.10))', border: '1px solid rgba(200,155,60,0.20)' }
            : { background: 'rgba(200,155,60,0.06)', border: '1px solid rgba(200,155,60,0.12)' }
        }
      >
        {msg.content}
        {isLive && (
          <span
            className="ml-0.5 inline-block h-[13px] w-[2px] rounded-full bg-[var(--color-gold)] align-middle"
            style={{ animation: 'blink 1s step-end infinite' }}
          />
        )}
      </div>
    </div>
  );
}

interface Props { userName: string }

export function AIChatClient({ userName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamingRef = useRef('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setError(null);
    setInput('');
    streamingRef.current = '';

    const userMsg: Message = { id: makeId(), role: 'user', content: trimmed };
    const aiMsg: Message = { id: makeId(), role: 'assistant', content: '' };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setStreaming(true);

    try {
      const history = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...history, { role: 'user', content: trimmed }] }),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data) as { delta?: string; chunk?: string };
            const chunk = parsed.delta ?? parsed.chunk ?? '';
            if (chunk) {
              streamingRef.current += chunk;
              const current = streamingRef.current;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (!last || last.role !== 'assistant') return prev;
                return [...prev.slice(0, -1), { ...last, content: current }];
              });
            }
          } catch {
            // skip malformed chunk
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setMessages((prev) => prev.at(-1)?.role === 'assistant' ? prev.slice(0, -1) : prev);
    } finally {
      setStreaming(false);
      streamingRef.current = '';
      inputRef.current?.focus();
    }
  }, [messages, streaming]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const clearChat = () => setMessages([]);

  const isEmpty = messages.length === 0;

  return (
    <>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
      `}</style>

      <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
        {/* Header */}
        <header
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: 'rgba(200,155,60,0.14)' }}
        >
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[2px] text-[var(--txt-3)]">AI Assistant</div>
            <h1 className="font-[var(--font-arabic)] mt-0.5 text-2xl text-[var(--color-gold-2)]">مددگار</h1>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="h-2 w-2 rounded-full"
              style={{ background: streaming ? '#c89b3c' : '#2d8a5f', boxShadow: streaming ? '0 0 6px #c89b3c' : '0 0 6px #2d8a5f' }}
            />
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="grid h-8 w-8 place-items-center rounded-xl transition-colors hover:bg-[var(--surf-2)]"
                title="Clear chat"
              >
                <Trash2 className="size-3.5 text-[var(--txt-3)]" />
              </button>
            )}
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
              <div
                className="grid h-16 w-16 place-items-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg,rgba(200,155,60,0.18),rgba(139,110,201,0.18))' }}
              >
                <Bot className="size-7 text-[var(--color-gold)]" />
              </div>
              <div>
                <div className="font-[var(--font-arabic)] text-xl text-[var(--color-gold-2)]">السلام علیکم</div>
                <p className="mt-1.5 text-[13px] text-[var(--txt-2)]">
                  Assalamu alaikum, {userName}. I&apos;m your Barakah Assistant.
                </p>
                <p className="mt-0.5 text-[12px] text-[var(--txt-3)]">
                  Ask me about Zakat, Sadaqah, Qarz-e-Hasana, or the family fund.
                </p>
              </div>
              <div className="flex w-full max-w-sm flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="rounded-xl border px-4 py-2.5 text-left text-[12.5px] text-[var(--txt-2)] transition-colors hover:border-[var(--color-gold-3)] hover:text-[var(--color-cream)]"
                    style={{ borderColor: 'rgba(200,155,60,0.18)', background: 'rgba(200,155,60,0.04)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isLive={streaming && i === messages.length - 1 && msg.role === 'assistant'}
                />
              ))}
              {streaming && messages[messages.length - 1]?.content === '' && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="mx-4 mb-2 rounded-xl px-4 py-2.5 text-[12.5px]"
            style={{ background: 'rgba(220,82,82,0.10)', border: '1px solid rgba(220,82,82,0.20)', color: '#f08585' }}
          >
            {error}
          </div>
        )}

        {/* Input bar */}
        <div
          className="border-t px-4 py-3"
          style={{ borderColor: 'rgba(200,155,60,0.14)', background: 'rgba(6,11,19,0.7)' }}
        >
          <div
            className="flex items-end gap-3 rounded-2xl px-4 py-2"
            style={{ border: '1px solid rgba(200,155,60,0.20)', background: 'rgba(200,155,60,0.04)' }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={streaming}
              placeholder="Ask about Zakat, Sadaqah, loans..."
              className="flex-1 resize-none bg-transparent py-1 text-[13.5px] text-[var(--color-cream)] placeholder:text-[var(--txt-4)] focus:outline-none disabled:opacity-50"
              style={{ maxHeight: 120 }}
            />
            <button
              onClick={() => void send(input)}
              disabled={streaming || !input.trim()}
              className="mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-all disabled:opacity-30"
              style={{ background: 'linear-gradient(135deg,#c89b3c,#d9b04c)', boxShadow: '0 2px 8px rgba(200,155,60,0.30)' }}
            >
              <Send className="size-3.5 text-[#0a0f1a]" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10.5px] text-[var(--txt-4)]">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}
