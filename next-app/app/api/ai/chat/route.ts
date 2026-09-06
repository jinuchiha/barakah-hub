import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { meApprovedOrThrow } from '@/lib/auth-server';

/**
 * AI chat — streams Server-Sent Events with `data: { delta }` chunks.
 *
 * Provider auto-detect (first match wins):
 *   1. ANTHROPIC_API_KEY → Claude Haiku 4.5
 *   2. GROQ_API_KEY       → Groq Cloud (Llama 3.1, free + fast)
 *   3. XAI_API_KEY        → Grok (xAI)
 *   4. OPENAI_API_KEY     → GPT-4o-mini
 *   5. (none)             → deterministic stub
 *
 * Mobile client (mobile/lib/ai.ts) parses `data:` lines as JSON looking
 * for `delta`, ending on `[DONE]`. We keep that protocol identical
 * across every provider.
 */
// Caller never controls the system prompt — this endpoint fronts the org's
// paid LLM keys, so both the persona and the payload size are server-enforced.
const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
    .max(30)
    .default([]),
});

// Per-member throttle so one account can't loop the org's paid LLM keys.
// In-memory = per-lambda on Vercel; a determined abuser gets a few times
// this across instances, which is still an order of magnitude below "loop
// it in a script" — same tradeoff as the auth rate limiter.
const AI_WINDOW_MS = 60 * 60 * 1000;
const AI_MAX_PER_WINDOW = 40;
const aiUsage = new Map<string, { windowStart: number; count: number }>();

function aiRateLimited(memberId: string): boolean {
  const now = Date.now();
  const u = aiUsage.get(memberId);
  if (!u || now - u.windowStart > AI_WINDOW_MS) {
    aiUsage.set(memberId, { windowStart: now, count: 1 });
    return false;
  }
  u.count += 1;
  return u.count > AI_MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  let memberId: string;
  try {
    const me = await meApprovedOrThrow();
    memberId = me.id;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (aiRateLimited(memberId)) {
    return NextResponse.json({ error: 'Rate limit reached · try again in an hour' }, { status: 429 });
  }

  let messages: { role: 'user' | 'assistant'; content: string }[];
  try {
    messages = bodySchema.parse(await req.json()).messages;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const system = defaultSystem();
  const encoder = new TextEncoder();

  // ── 1. Anthropic Claude ─────────────────────────────────────────
  if (process.env.ANTHROPIC_API_KEY) {
    return streamSSE(async (push) => {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const claudeStream = await anthropic.messages.stream({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      for await (const event of claudeStream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          push(event.delta.text);
        }
      }
    }, encoder);
  }

  // ── 2. Groq Cloud (Llama 3.1, free + sub-second latency) ────────
  if (process.env.GROQ_API_KEY) {
    return streamSSE((push) =>
      streamOpenAICompatible({
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY!,
        // llama-3.3-70b-versatile was deprecated by Groq in June 2026;
        // openai/gpt-oss-120b is their recommended replacement.
        model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b',
        system,
        messages,
        onDelta: push,
      }), encoder);
  }

  // ── 3. xAI Grok (OpenAI-compatible) ─────────────────────────────
  if (process.env.XAI_API_KEY) {
    return streamSSE((push) =>
      streamOpenAICompatible({
        baseUrl: 'https://api.x.ai/v1',
        apiKey: process.env.XAI_API_KEY!,
        model: process.env.XAI_MODEL ?? 'grok-3-mini',
        system,
        messages,
        onDelta: push,
      }), encoder);
  }

  // ── 4. OpenAI GPT ───────────────────────────────────────────────
  if (process.env.OPENAI_API_KEY) {
    return streamSSE((push) =>
      streamOpenAICompatible({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY!,
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        system,
        messages,
        onDelta: push,
      }), encoder);
  }

  // ── 5. Stub fallback ────────────────────────────────────────────
  const lastUser = messages.filter((m) => m.role === 'user').at(-1)?.content ?? '';
  const reply = pickStubReply(lastUser);
  return streamSSE(async (push) => {
    for (const chunk of reply.split(/(\s+)/).filter(Boolean)) {
      push(chunk);
      await new Promise((r) => setTimeout(r, 25));
    }
  }, encoder);
}

/* ─── helpers ─── */

type DeltaPush = (text: string) => void;

function streamSSE(run: (push: DeltaPush) => Promise<void>, encoder: TextEncoder): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const push: DeltaPush = (text) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`));
      };
      try {
        await run(push);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'AI error';
        push(`\n\n[AI error: ${msg}]`);
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

interface OpenAICompatibleOpts {
  baseUrl: string;
  apiKey: string;
  model: string;
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  onDelta: DeltaPush;
}

/** Stream from any OpenAI-compatible endpoint (xAI, OpenAI, Together, …). */
async function streamOpenAICompatible(opts: OpenAICompatibleOpts): Promise<void> {
  const res = await fetch(`${opts.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      stream: true,
      messages: [{ role: 'system', content: opts.system }, ...opts.messages],
    }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`${opts.baseUrl} returned ${res.status}: ${text.slice(0, 200)}`);
  }

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
        const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) opts.onDelta(delta);
      } catch {
        // skip malformed chunk
      }
    }
  }
}

function defaultSystem(): string {
  return `You are Barakah Assistant, an AI guide inside the Barakah Hub family-fund app. Help users with:
- Zakat calculations (2.5% on qualifying wealth above nisab)
- Sadaqah and Qarz-e-Hasana (interest-free loans) guidance
- Islamic finance and inheritance basics
- Using the app's features (donations, voting, repayments)

Be concise (2-4 sentences typical), respectful, and grounded in Sunni jurisprudence. Use Islamic greetings naturally. For exact figures, always remind the user to check the app's actual data.

Religious content rules (non-negotiable):
- NEVER invent or guess a Quran or hadith citation. Quote scripture only when you are certain of the wording, and name the surah:ayah or hadith collection and number. If unsure, say so rather than citing.
- You explain general principles; you do not issue fatwas. For any personal ruling (what someone owes, whether something is halal for them, inheritance shares), explain the general position and direct them to a qualified scholar.
- Where recognised schools of fiqh differ (e.g. nisab basis, Asr time), say that they differ instead of presenting one view as the only one.
- Never present a weak or fabricated narration as authentic.`;
}

function pickStubReply(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('zakat')) {
    return 'Zakat is 2.5% of qualifying wealth held for one lunar year (hawl). Open the My Payments tab and filter by the Zakat pool to see your contributions. The fund card on the dashboard shows the running total.';
  }
  if (q.includes('sadaqah') || q.includes('sadqa')) {
    return 'Sadaqah is voluntary charity, given at any time. Submit yours via My Account → New donation. Sadaqah given in secret is most rewarded · your donor name is hidden from other members in the community feed.';
  }
  if (q.includes('qarz') || q.includes('loan')) {
    return 'Qarz-e-Hasana is an interest-free loan from the family fund. Submit a request in the Emergency Cases tab. After community approval, an admin issues the loan; you repay in instalments via the Loans tab.';
  }
  if (q.includes('vote') || q.includes('emergency')) {
    return 'Open emergency cases appear in the Emergency Vote tab. Each approved member can cast one yes/no vote. When yes-votes cross the configured threshold (default 50%), the case is approved for disbursement.';
  }
  return 'Salaam. I can help with Zakat, Sadaqah, Qarz-e-Hasana, voting on emergency cases, and using Barakah Hub. The full AI assistant is being configured (set ANTHROPIC_API_KEY, GROQ_API_KEY, XAI_API_KEY, or OPENAI_API_KEY to enable a live LLM).';
}
