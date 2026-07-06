import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export const runtime = 'nodejs';

/**
 * QR image for the receipt email — email clients block data: URIs, so
 * the slip embeds this endpoint instead. The QR encodes the public
 * verification URL; no payment data is exposed here (the id alone is
 * an unguessable UUID).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Bad id' }, { status: 400 });
  }
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://barakah-hub.vercel.app';
  const png = await QRCode.toBuffer(`${base}/verify-receipt/${id}`, {
    width: 264,
    margin: 1,
    color: { dark: '#0a0f1a', light: '#f8f5ec' },
  });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
