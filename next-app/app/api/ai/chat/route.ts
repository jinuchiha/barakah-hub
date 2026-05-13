import { NextResponse } from 'next/server';
import { meOrThrow } from '@/lib/auth-server';

/**
 * AI chat — streaming SSE. Currently a graceful stub: returns a fixed
 * "feature pending" message in the same `data: { delta }` format the
 * mobile app expects. Wire to OpenAI / Anthropic later by adding an
 * ANTHROPIC_API_KEY env var and swapping the loop body for a real call.
 */
export async function POST(req: Request) {
  try {
    await meOrThrow();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { messages?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const lastUser = body.messages?.filter((m) => m.role === 'user').at(-1)?.content ?? '';

  // Provide a contextually-useful fallback so the assistant isn't dead weight.
  const reply = pickReply(lastUser);

  // Split into delta chunks so the typing animation works.
  const chunks = reply.split(/(\s+)/).filter(Boolean);
  const encoder = new TextEncoder();

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

function pickReply(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('zakat')) {
    return 'Zakat is 2.5% of qualifying wealth held for one lunar year. To see your contributions, open the My Payments tab and filter by the Zakat pool. The total for the current month is shown in the Dashboard fund card.';
  }
  if (q.includes('sadaqah') || q.includes('sadqa')) {
    return 'Sadaqah is voluntary charity, given at any time and amount. Submit yours via My Account → New donation. Verified contributions count toward the family fund total.';
  }
  if (q.includes('qarz') || q.includes('loan')) {
    return 'Qarz-e-Hasana is an interest-free loan from the family fund. An admin issues it; you repay in instalments via the Loans tab. Open the Emergency Cases section to request one.';
  }
  if (q.includes('vote') || q.includes('emergency')) {
    return 'Open emergency cases appear in the Emergency Vote tab. Each approved member can cast one yes/no vote. When yes-votes cross the configured threshold (default 50%), the case is approved for disbursement.';
  }
  return 'Salaam. I can answer questions about Zakat, Sadaqah, Qarz-e-Hasana, voting on emergency cases, and how to use Barakah Hub. The full AI assistant is being configured — ask me about a specific feature and I will guide you.';
}
