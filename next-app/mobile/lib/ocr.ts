import { api } from './api';

export interface OcrResult {
  amount: number | null;
  date: string | null;
  rawText: string;
}

function extractAmountFromText(text: string): number | null {
  const patterns = [
    /PKR\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /Amount[:\s]+([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /([0-9]{3,}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const cleaned = match[1].replace(/,/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return null;
}

function extractDateFromText(text: string): string | null {
  const patterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(\d{4}[\/\-]\d{2}[\/\-]\d{2})/,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export async function extractReceiptData(imageUri: string): Promise<OcrResult> {
  try {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'receipt.jpg',
    } as unknown as Blob);

    const { data } = await api.post<{ text: string }>('/api/ocr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 20000,
    });

    const rawText = data.text ?? '';
    return {
      rawText,
      amount: extractAmountFromText(rawText),
      date: extractDateFromText(rawText),
    };
  } catch {
    return { rawText: '', amount: null, date: null };
  }
}
