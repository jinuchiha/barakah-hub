import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricType = 'fingerprint' | 'face' | 'iris' | 'none';

export interface BiometricCapability {
  available: boolean;
  enrolled: boolean;
  types: BiometricType[];
}

function mapAuthType(t: LocalAuthentication.AuthenticationType): BiometricType {
  if (t === LocalAuthentication.AuthenticationType.FINGERPRINT) return 'fingerprint';
  if (t === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) return 'face';
  if (t === LocalAuthentication.AuthenticationType.IRIS) return 'iris';
  return 'none';
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  const available = await LocalAuthentication.hasHardwareAsync();
  if (!available) return { available: false, enrolled: false, types: [] };

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const rawTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const types = rawTypes.map(mapAuthType).filter((t) => t !== 'none');

  return { available, enrolled, types };
}

export async function authenticateWithBiometric(
  promptMessage: string,
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Use PIN',
      disableDeviceFallback: true,
      fallbackLabel: 'Enter PIN',
    });
    return result.success;
  } catch {
    return false;
  }
}

export function getBiometricLabel(types: BiometricType[]): string {
  if (types.includes('face')) return 'Face ID';
  if (types.includes('fingerprint')) return 'Fingerprint';
  if (types.includes('iris')) return 'Iris Scan';
  return 'Biometric';
}
