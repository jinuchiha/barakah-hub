import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { meOrThrow } from '@/lib/auth-server';

/**
 * AI chat — streams Server-Sent Events with `data: { delta }` chunks.
 *
 * When ANTHROPIC_API_KEY is set, this hits Claude Haiku for cheap, fast
 * responses tuned to Islamic family-fund Q&A. Without the key, returns a
 * deterministic stub so the mobile app's chat UI keeps working in dev.
 *
 * The mobile client (mobile/lib/ai.ts) splits on `\n` and parses each
 * `data:` line as JSON looking for `delta`, ending on `[DONE]`. We keep
 * that protocol intact for both paths.
 */
export async function POST(req: Request) {
  try {
    await meOrThrow();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { messages?: { role: 'user' | 'assistant'; content: string }[]; systemPrompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const messages = body.messages ?? [];
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const encoder = new TextEncoder();

  // ── Live Claude path ─────────────────────────────────────────────
  if (apiKey) {
    const anthropic = new Anthropic({ apiKey });
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const claudeStream = await anthropic.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: body.systemPrompt ?? defaultSystem(),
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
          });
          for await (const event of claudeStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'AI error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: `\n\n[AI error: ${msg}]` })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } finally {
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

  // ── Stub path ────────────────────────────────────────────────────
  const lastUser = messages.filter((m) => m.role === 'user').at(-1)?.content ?? '';
  const reply = pickStubReply(lastUser);
  const chunks = reply.split(/(\s+)/).filter(Boolean);

  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: chunk })}\n\n`));
        await new Promise((r) => setTimeout(r, 25));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
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

function defaultSystem(): string {
  return `You are Barakah Assistant, an AI guide inside the Barakah Hub family-fund app. Help users with:
- Zakat calculations (2.5% on qualifying wealth above nisab)
- Sadaqah and Qarz-e-Hasana (interest-free loans) guidance
- Islamic finance and inheritance basics
- Using the app's features (donations, voting, repayments)

Be concise (2-4 sentences typical), respectful, and grounded in Sunni jurisprudence. Use Islamic greetings naturally. For exact figures, always remind the user to check the app's actual data.`;
}

function pickStubReply(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('zakat')) {
    return 'Zakat is 2.5% of qualifying wealth held for one lunar year (hawl). Open the My Payments tab and filter by the Zakat pool to see your contributions. The fund card on the dashboard shows the running total.';
  }
  if (q.includes('sadaqah') || q.includes('sadqa')) {
    return 'Sadaqah is voluntary charity, given at any time. Submit yours via My Account → New donation. Sadaqah given in secret is most rewarded — your donor name is hidden from other members in the community feed.';
  }
  if (q.includes('qarz') || q.includes('loan')) {
    return 'Qarz-e-Hasana is an interest-free loan from the family fund. Submit a request in the Emergency Cases tab. After community approval, an admin issues the loan; you repay in instalments via the Loans tab.';
  }
  if (q.includes('vote') || q.includes('emergency')) {
    return 'Open emergency cases appear in the Emergency Vote tab. Each approved member can cast one yes/no vote. When yes-votes cross the configured threshold (default 50%), the case is approved for disbursement.';
  }
  return 'Salaam. I can help with Zakat, Sadaqah, Qarz-e-Hasana, voting on emergency cases, and using Barakah Hub. The full AI assistant is being configured (add ANTHROPIC_API_KEY to enable Claude). Ask me about a specific feature meanwhile.';
}
