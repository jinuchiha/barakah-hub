import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRCodeSVG from 'react-native-qrcode-svg';
import { useTheme } from '@/lib/useTheme';
import { radius } from '@/lib/theme';

interface QRCodeProps {
  value: string;
  size?: number;
}

export function QRCode({ value, size = 200 }: QRCodeProps) {
  const { colors, mode } = useTheme();
  const fg = mode === 'light' ? '#000000' : '#ffffff';
  const bg = mode === 'light' ? '#ffffff' : colors.bg2;

  return (
    <View style={[styles.wrapper, { backgroundColor: bg, padding: 12, borderRadius: radius.xl }]}>
      <QRCodeSVG
        value={value || 'barakah://empty'}
        size={size}
        color={fg}
        backgroundColor={bg}
        quietZone={4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'center' },
});
