'use client';
import { useTransition, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { revokeInvite } from '@/app/actions';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Invite {
  id: string;
  token: string;
  label: string | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  revoked: boolean;
  createdAt: string;
  createdBy: string;
}

export default function InviteRow({ invite, origin }: { invite: Invite; origin: string }) {
  const url = `${origin}/join/${invite.token}`;
  const [pending, start] = useTransition();
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  useEffect(() => {
    if (!showQR || qrDataUrl) return;
    void QRCode.toDataURL(url, { width: 180, margin: 1 }).then(setQrDataUrl);
  }, [showQR, url, qrDataUrl]);

  const expired = invite.expiresAt && new Date(invite.expiresAt) < new Date();
  const exhausted = invite.usedCount >= invite.maxUses;
  const inactive = invite.revoked || expired || exhausted;

  const status = invite.revoked
    ? { text: 'Revoked', color: 'text-red-400' }
    : expired
    ? { text: 'Expired', color: 'text-yellow-400' }
    : exhausted
    ? { text: 'Used up', color: 'text-yellow-400' }
    : { text: 'Active', color: 'text-emerald-400' };

  function copy() {
    navigator.clipboard.writeText(url).then(
      () => toast.success('Invite link copied'),
      () => toast.error('Could not copy · select the link and copy manually'),
    );
  }

  function revoke() {
    start(async () => {
      try {
        await revokeInvite(invite.id);
        toast.success('Invite revoked');
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    });
  }

  return (
    <div className={`border-b border-[rgba(214,210,199,0.06)] px-4 py-3 ${inactive ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] uppercase tracking-wider ${status.color}`}>● {status.text}</span>
            <span className="text-xs text-[var(--color-cream)]">{invite.label ?? 'Unlabelled'}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--color-gold-4)]">
            By {invite.createdBy} · {new Date(invite.createdAt).toLocaleDateString('en-GB')} · {invite.usedCount}/{invite.maxUses} used
            {invite.expiresAt && ` · expires ${new Date(invite.expiresAt).toLocaleDateString('en-GB')}`}
          </div>
          <code className="mt-2 inline-block break-all font-[var(--font-en)] text-[11px] text-[var(--color-gold-2)]">{url}</code>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={copy} disabled={inactive} className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--color-gold-2)] hover:bg-[rgba(214,210,199,0.06)] disabled:cursor-not-allowed">Copy link</button>
          <button onClick={() => setShowQR((s) => !s)} disabled={inactive} className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--color-gold-2)] hover:bg-[rgba(214,210,199,0.06)] disabled:cursor-not-allowed">{showQR ? '✕ Close QR' : 'Show QR'}</button>
          {!invite.revoked && (
            <button type="button" onClick={() => setConfirmRevoke(true)} disabled={pending} className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20">{pending ? '…' : 'Revoke'}</button>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmRevoke}
        onOpenChange={setConfirmRevoke}
        title="Revoke Invite"
        description="New signups via this link will be rejected. This cannot be undone."
        confirmLabel="Revoke"
        destructive
        onConfirm={revoke}
      />
      {showQR && (
        <div className="mt-3 flex justify-center rounded-md border border-[var(--border)] bg-white p-3">
          {qrDataUrl
            ? <img src={qrDataUrl} alt="Invite QR code" width={180} height={180} />
            : <div className="size-[180px] animate-pulse rounded bg-gray-200" />}
        </div>
      )}
    </div>
  );
}
