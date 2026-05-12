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

export function decodeQR(raw: string): QRData | null {
  try {
    const prefix = 'barakah://qr/';
    if (!raw.startsWith(prefix)) return null;
    const decoded = decodeURIComponent(raw.slice(prefix.length));
    return JSON.parse(decoded) as QRData;
  } catch {
    return null;
  }
}

export function buildMemberQR(id: string, name: string): string {
  return encodeQR({ type: 'member', id, name });
}
