import { useState, useCallback, useEffect } from 'react';
import {
  getBiometricCapability,
  authenticateWithBiometric,
  getBiometricLabel,
  type BiometricCapability,
} from '@/lib/biometric';
import { setBiometricEnabled, isBiometricEnabled } from '@/lib/security';

interface BiometricState {
  capability: BiometricCapability | null;
  enabled: boolean;
  label: string;
  loading: boolean;
}

interface BiometricActions {
  authenticate: (prompt: string) => Promise<boolean>;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useBiometric(): BiometricState & BiometricActions {
  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [cap, isEnabled] = await Promise.all([
        getBiometricCapability(),
        isBiometricEnabled(),
      ]);
      setCapability(cap);
      setEnabled(isEnabled);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const authenticate = useCallback(async (prompt: string): Promise<boolean> => {
    return authenticateWithBiometric(prompt);
  }, []);

  const enable = useCallback(async () => {
    const success = await authenticateWithBiometric('Confirm biometric to enable');
    if (success) {
      await setBiometricEnabled(true);
      setEnabled(true);
    }
  }, []);

  const disable = useCallback(async () => {
    await setBiometricEnabled(false);
    setEnabled(false);
  }, []);

  const label = capability ? getBiometricLabel(capability.types) : 'Biometric';

  return { capability, enabled, label, loading, authenticate, enable, disable, refresh };
}
