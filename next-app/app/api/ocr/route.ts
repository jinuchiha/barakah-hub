import { NextResponse } from 'next/server';
import { meOrThrow } from '@/lib/auth-server';

/**
 * OCR endpoint — stub. Mobile sends a receipt image and expects text +
 * structured fields (amount, date, payee). Wire to a real OCR provider
 * (Google Vision, AWS Textract, Tesseract) by replacing the body below.
 */
export async function POST() {
  try {
    await meOrThrow();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    text: '',
    amount: null,
    date: null,
    payee: null,
    note: 'OCR provider is not yet configured. Please enter the amount manually.',
  });
}
