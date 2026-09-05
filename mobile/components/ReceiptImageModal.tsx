import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getSessionToken } from '@/lib/storage';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

interface ReceiptImageModalProps {
  /** App-relative (`/api/files/...`) or absolute receipt URL. */
  url: string;
  onClose: () => void;
}

/**
 * In-app receipt viewer.
 *
 * Receipts are served by the authenticated /api/files route, which needs the
 * Bearer token — so opening them in the system browser (no token, no cookie)
 * can never work. RN's Image accepts per-request headers; legacy absolute
 * URLs (old public storage) load without them.
 */
export function ReceiptImageModal({ url, onClose }: ReceiptImageModalProps) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const isRelative = url.startsWith('/');
  const uri = isRelative ? `${process.env.EXPO_PUBLIC_API_URL ?? ''}${url}` : url;

  useEffect(() => {
    let cancelled = false;
    getSessionToken()
      .then((t) => { if (!cancelled) { setToken(t); setTokenLoaded(true); } })
      .catch(() => { if (!cancelled) setTokenLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const ready = !isRelative || tokenLoaded;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={styles.closeButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close receipt"
          hitSlop={12}
        >
          <MaterialCommunityIcons name="close" size={26} color="#fff" />
        </Pressable>
        {!ready ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : failed ? (
          <View style={[styles.errorBox, { backgroundColor: colors.bg2, borderColor: colors.border1 }]}>
            <MaterialCommunityIcons name="image-off-outline" size={32} color={colors.text3} />
            <Text style={[styles.errorText, { color: colors.text2 }]}>
              Receipt could not be loaded. Check your connection and try again.
            </Text>
          </View>
        ) : (
          <Image
            source={{
              uri,
              headers: isRelative && token ? { Authorization: `Bearer ${token}` } : undefined,
            }}
            style={{ width: width - spacing.lg * 2, height: height * 0.7, borderRadius: radius.md }}
            resizeMode="contain"
            accessibilityLabel="Payment receipt image"
            onError={() => setFailed(true)}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: spacing.lg,
    zIndex: 2,
    padding: spacing.sm,
  },
  errorBox: {
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
