import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const APP_DOMAIN = 'https://barakah.app';

export async function shareText(text: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) return;

  const tempUri = `${FileSystem.cacheDirectory}share_text.txt`;
  await FileSystem.writeAsStringAsync(tempUri, text);
  await Sharing.shareAsync(tempUri, { mimeType: 'text/plain' });
}

export async function shareImageFile(uri: string, message?: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) return;
  await Sharing.shareAsync(uri, {
    mimeType: 'image/jpeg',
    dialogTitle: message ?? 'Share',
  });
}

export async function shareCaseSummary(params: {
  id: string;
  beneficiaryName: string;
  amount: number;
  caseType: string;
}): Promise<void> {
  const link = `${APP_DOMAIN}/case/${params.id}`;
  const text = [
    `Barakah Hub - Emergency Case`,
    `Beneficiary: ${params.beneficiaryName}`,
    `Amount: PKR ${params.amount.toLocaleString()}`,
    `Type: ${params.caseType}`,
    ``,
    link,
  ].join('\n');
  await shareText(text);
}

export async function sharePaymentReceipt(params: {
  id: string;
  amount: number;
  monthLabel: string;
  receiptUri?: string;
}): Promise<void> {
  if (params.receiptUri) {
    await shareImageFile(
      params.receiptUri,
      `Payment of PKR ${params.amount.toLocaleString()} for ${params.monthLabel}`,
    );
    return;
  }

  const link = `${APP_DOMAIN}/payment/${params.id}`;
  const text = [
    `Barakah Hub - Payment Receipt`,
    `Amount: PKR ${params.amount.toLocaleString()}`,
    `Month: ${params.monthLabel}`,
    ``,
    link,
  ].join('\n');
  await shareText(text);
}

export async function shareMemberReferral(joinCode: string): Promise<void> {
  const text = [
    `Join Barakah Hub - Our Family Fund`,
    `Use my join code: ${joinCode}`,
    ``,
    `${APP_DOMAIN}/join?code=${joinCode}`,
  ].join('\n');
  await shareText(text);
}
