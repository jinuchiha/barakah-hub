import { describe, it, expect } from 'vitest';
import { canAccessStoredFile, isValidStoredPathname, isAllowedReceiptUrl } from '@/lib/file-access';

const OWNER = { id: 'aaaaaaaa-1111-2222-3333-444444444444', role: 'member' as const };
const OTHER = { id: 'bbbbbbbb-1111-2222-3333-444444444444', role: 'member' as const };
const ADMIN = { id: 'cccccccc-1111-2222-3333-444444444444', role: 'admin' as const };
const SUPERVISOR = { id: 'dddddddd-1111-2222-3333-444444444444', role: 'supervisor' as const };

const RECEIPT = `receipts/${OWNER.id}/receipt_abc123-xyz.jpg`;

describe('canAccessStoredFile — private-file authorization (IDOR gate)', () => {
  it('lets the owning member read their own receipt', () => {
    expect(canAccessStoredFile(RECEIPT, OWNER)).toBe(true);
  });

  it('DENIES another member the same receipt', () => {
    expect(canAccessStoredFile(RECEIPT, OTHER)).toBe(false);
  });

  it('lets admin and supervisor read any receipt (verification workflow)', () => {
    expect(canAccessStoredFile(RECEIPT, ADMIN)).toBe(true);
    expect(canAccessStoredFile(RECEIPT, SUPERVISOR)).toBe(true);
  });

  it('legacy receipts (no derivable owner) are reviewer-only', () => {
    const legacy = 'receipts/legacy/receipt_old.jpg';
    expect(canAccessStoredFile(legacy, ADMIN)).toBe(true);
    expect(canAccessStoredFile(legacy, SUPERVISOR)).toBe(true);
    expect(canAccessStoredFile(legacy, OWNER)).toBe(false);
  });

  it('denies everything outside receipts/ — new private classes are opt-in', () => {
    expect(canAccessStoredFile('avatars/avatar-abc.jpg', ADMIN)).toBe(false);
    expect(canAccessStoredFile('backups/db.sql', ADMIN)).toBe(false);
  });

  it('rejects traversal and malformed pathnames', () => {
    expect(canAccessStoredFile('receipts/../secrets/env', ADMIN)).toBe(false);
    expect(canAccessStoredFile('receipts/%2e%2e/x.jpg', ADMIN)).toBe(false);
    expect(canAccessStoredFile('receipts//x.jpg', ADMIN)).toBe(false);
    expect(canAccessStoredFile('receipts', ADMIN)).toBe(false);
    expect(canAccessStoredFile('', ADMIN)).toBe(false);
  });
});

describe('isValidStoredPathname', () => {
  it('accepts the shapes the upload routes produce', () => {
    expect(isValidStoredPathname(RECEIPT)).toBe(true);
    expect(isValidStoredPathname('receipts/legacy/receipt_old-suffix.webp')).toBe(true);
  });
  it('rejects dot segments and overlong paths', () => {
    expect(isValidStoredPathname('receipts/./x.jpg')).toBe(false);
    expect(isValidStoredPathname('a/b/c/d/e/f')).toBe(false);
  });
});

describe('isAllowedReceiptUrl — what a payment may reference', () => {
  it('accepts the authed download route and dev uploads', () => {
    expect(isAllowedReceiptUrl(`/api/files/${RECEIPT}`)).toBe(true);
    expect(isAllowedReceiptUrl('/uploads/receipts/receipt_x.jpg')).toBe(true);
  });

  it('REJECTS arbitrary https URLs — the tracking-pixel vector', () => {
    expect(isAllowedReceiptUrl('https://evil.example/pixel.png')).toBe(false);
    expect(isAllowedReceiptUrl('https://x.public.blob.vercel-storage.com/receipts/r.jpg')).toBe(false);
  });

  it('rejects traversal and oversized values', () => {
    expect(isAllowedReceiptUrl('/api/files/receipts/../../secret')).toBe(false);
    expect(isAllowedReceiptUrl('/uploads/../.env')).toBe(false);
    expect(isAllowedReceiptUrl('/api/files/receipts/' + 'a'.repeat(600))).toBe(false);
  });
});
