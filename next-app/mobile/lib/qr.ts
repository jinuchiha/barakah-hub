export interface MemberQRData {
  type: 'member';
  id: string;
  name: string;
}

export interface InviteQRData {
  type: 'invite';
  code: string;
}

export interface PaymentQRData {
  type: 'payment';
  account: string;
  bank: string;
  name: string;
}

export type QRData = MemberQRData | InviteQRData | PaymentQRData;

export function encodeQR(data: QRData): string {
  return `barakah://qr/${encodeURIComponent(JSON.stringify(data))}`;
}

function isValidQRData(v: unknown): v is QRData {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (o.type === 'member') return typeof o.id === 'string' && typeof o.name === 'string';
  if (o.type === 'invite') return typeof o.code === 'string';
  if (o.type === 'payment') {
    return typeof o.account === 'string' && typeof o.bank === 'string' && typeof o.name === 'string';
  }
  return false;
}

export function decodeQR(raw: string): QRData | null {
  try {
    const prefix = 'barakah://qr/';
    if (!raw.startsWith(prefix)) return null;
    const decoded = decodeURIComponent(raw.slice(prefix.length));
    const parsed: unknown = JSON.parse(decoded);
    return isValidQRData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function buildMemberQR(id: string, name: string): string {
  return encodeQR({ type: 'member', id, name });
}
