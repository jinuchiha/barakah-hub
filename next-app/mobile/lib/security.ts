import * as ScreenCapture from 'expo-screen-capture';
import * as SecureStore from 'expo-secure-store';

const SCREENSHOT_KEY = 'bh_screenshot_protection';
const BIOMETRIC_ENABLED_KEY = 'bh_biometric_enabled';

export async function enableScreenCapturePrevention(): Promise<void> {
  try {
    await ScreenCapture.preventScreenCaptureAsync();
  } catch {
    // Not available on all devices
  }
}

export async function disableScreenCapturePrevention(): Promise<void> {
  try {
    await ScreenCapture.allowScreenCaptureAsync();
  } catch {
    // Not available on all devices
  }
}

export async function setScreenshotProtection(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(SCREENSHOT_KEY, enabled ? 'true' : 'false');
  if (enabled) {
    await enableScreenCapturePrevention();
  } else {
    await disableScreenCapturePrevention();
  }
}

export async function isScreenshotProtectionEnabled(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(SCREENSHOT_KEY);
  return v === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function isBiometricEnabled(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return v === 'true';
}
