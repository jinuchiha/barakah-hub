'use client';
import { useState } from 'react';
import { toast } from 'sonner';

/** Admin sanity check: sends yourself a WhatsApp test via the Cloud API. */
export default function WhatsAppTestButton() {
  const [busy, setBusy] = useState(false);

  async function test() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/whatsapp-test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      if (!data.configured) toast.error(`WhatsApp abhi configured nahi: ${data.hint}`);
      else if (!data.sent) toast.error(data.hint ?? 'Send failed · token/number ID check karein');
      else toast.success('Test message bhej diya · apna WhatsApp dekhein');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={test}
      disabled={busy}
      className="rounded-lg border border-[rgba(45,138,95,0.4)] bg-[rgba(45,138,95,0.10)] px-4 py-2 text-xs font-semibold text-[#4ec38d] transition-colors hover:bg-[rgba(45,138,95,0.18)] disabled:opacity-50"
    >
      {busy ? 'Bhej raha hai…' : '🟢 WhatsApp test bhejein'}
    </button>
  );
}
