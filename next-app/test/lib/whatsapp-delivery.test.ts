/**
 * Regression tests for lib/whatsapp.ts (BH-08).
 *
 * The app sends every notification — payment receipts, account approvals,
 * emergency vote requests, monthly statements — as WhatsApp FREE TEXT. Meta
 * only permits free text inside a 24-hour window opened by the member
 * messaging the business, so business-initiated messages are rejected. The
 * old code logged that identically to a network blip and returned a boolean
 * every caller discarded, so the primary channel for this audience could be
 * entirely broken and nobody would know.
 *
 * What is pinned here: the rejection is identified specifically, it is
 * reported rather than swallowed, and a configured template is preferred so
 * delivery can actually be fixed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ENV = { ...process.env };

function metaError(code: number, status = 400) {
  return new Response(JSON.stringify({ error: { code, message: 'x' } }), {
    status, headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.resetModules();
  process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
  delete process.env.WHATSAPP_TEMPLATE_RECEIPT;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  process.env = { ...ENV };
});

const PHONE = '03001234567';

describe('sendWhatsAppTextResult — failures are diagnosable', () => {
  it('identifies the 24-hour-window rejection specifically', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => metaError(131047)));
    const { sendWhatsAppTextResult } = await import('@/lib/whatsapp');
    const res = await sendWhatsAppTextResult(PHONE, 'hello');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('outside-session-window');
  });

  it.each([131026, 470])('recognises Meta code %i as the same condition', async (code) => {
    vi.stubGlobal('fetch', vi.fn(async () => metaError(code)));
    const { sendWhatsAppTextResult } = await import('@/lib/whatsapp');
    expect((await sendWhatsAppTextResult(PHONE, 'x')).reason).toBe('outside-session-window');
  });

  it('distinguishes a generic API error from the window rejection', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => metaError(190, 401)));
    const { sendWhatsAppTextResult } = await import('@/lib/whatsapp');
    const res = await sendWhatsAppTextResult(PHONE, 'x');
    expect(res.reason).toBe('api-error');
  });

  it('distinguishes a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ETIMEDOUT'); }));
    const { sendWhatsAppTextResult } = await import('@/lib/whatsapp');
    expect((await sendWhatsAppTextResult(PHONE, 'x')).reason).toBe('network');
  });

  it('reports a missing phone without calling the API', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    const { sendWhatsAppTextResult } = await import('@/lib/whatsapp');
    expect((await sendWhatsAppTextResult(null, 'x')).reason).toBe('no-phone');
    expect(spy).not.toHaveBeenCalled();
  });

  it('reports missing configuration without calling the API', async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    const { sendWhatsAppTextResult } = await import('@/lib/whatsapp');
    expect((await sendWhatsAppTextResult(PHONE, 'x')).reason).toBe('not-configured');
    expect(spy).not.toHaveBeenCalled();
  });

  it('succeeds on a 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    const { sendWhatsAppTextResult } = await import('@/lib/whatsapp');
    expect((await sendWhatsAppTextResult(PHONE, 'x')).ok).toBe(true);
  });
});

describe('sendWhatsAppBusinessMessage — prefers an approved template', () => {
  it('sends a TEMPLATE when one is configured', async () => {
    process.env.WHATSAPP_TEMPLATE_RECEIPT = 'payment_receipt_v1';
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const { sendWhatsAppBusinessMessage } = await import('@/lib/whatsapp');
    const res = await sendWhatsAppBusinessMessage(PHONE, {
      templateEnvVar: 'WHATSAPP_TEMPLATE_RECEIPT',
      templateParams: ['Ali', 'Rs 500', 'May 2026'],
      fallbackText: 'fallback',
    });

    expect(res.ok).toBe(true);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.type).toBe('template');
    expect(body.template.name).toBe('payment_receipt_v1');
    expect(body.template.components[0].parameters).toHaveLength(3);
  });

  it('falls back to free text when no template is configured', async () => {
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const { sendWhatsAppBusinessMessage } = await import('@/lib/whatsapp');
    const res = await sendWhatsAppBusinessMessage(PHONE, {
      templateEnvVar: 'WHATSAPP_TEMPLATE_RECEIPT',
      templateParams: [],
      fallbackText: 'receipt text',
    });

    expect(res.ok).toBe(true);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.type).toBe('text');
  });

  it('surfaces the window rejection AND names the env var to set', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => metaError(131047)));
    const errSpy = vi.spyOn(console, 'error');

    const { sendWhatsAppBusinessMessage } = await import('@/lib/whatsapp');
    const res = await sendWhatsAppBusinessMessage(PHONE, {
      templateEnvVar: 'WHATSAPP_TEMPLATE_RECEIPT',
      templateParams: [],
      fallbackText: 'receipt text',
    });

    expect(res.ok).toBe(false);
    expect(res.reason).toBe('outside-session-window');
    const logged = errSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logged).toContain('WHATSAPP_TEMPLATE_RECEIPT');
    expect(logged).toMatch(/NOT delivered|24-hour/i);
  });
});
