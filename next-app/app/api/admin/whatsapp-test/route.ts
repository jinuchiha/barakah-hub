import { NextResponse } from 'next/server';
import { meOrThrow } from '@/lib/auth-server';
import { sendWhatsAppText } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One-tap sanity check for the Cloud API setup: sends the calling admin
 * a test message on their own phone. Returns configured=false when the
 * env vars are missing so the UI can explain instead of failing silently.
 */
export async function POST() {
  try {
    const me = await meOrThrow();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const configured = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
    if (!configured) {
      return NextResponse.json({ configured: false, sent: false, hint: 'WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID missing in Vercel env' });
    }
    if (!me.phone) {
      return NextResponse.json({ configured: true, sent: false, hint: 'Apne profile mein phone number set karein pehle' });
    }
    const sent = await sendWhatsAppText(
      me.phone,
      `✅ *Barakah Hub WhatsApp test*\n\nSetup kaam kar raha hai! Receipts, reminders aur approvals ab is number se aayein ge.\n\nجزاک اللہ خیر`,
    );
    return NextResponse.json({ configured: true, sent });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
