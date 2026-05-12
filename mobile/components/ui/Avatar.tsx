import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { getInitials } from '@/lib/format';
import { darkColors } from '@/lib/theme';

const RING_COLORS = [
  '#00e676', '#448aff', '#ffd740', '#ff5252', '#ea80fc', '#00e5ff',
];

function hashIndex(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % RING_COLORS.length;
}

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 28, sm: 36, md: 44, lg: 56, xl: 72, xxl: 96,
};

interface AvatarProps {
  name: string;
  size?: AvatarSize | number;
  color?: string;
  imageUrl?: string | null;
  showStatus?: 'online' | 'offline';
  style?: ViewStyle;
}

function StatusDot({ status, size }: { status: 'online' | 'offline'; size: number }) {
  const dotSize = Math.max(10, size * 0.22);
  return (
    <View
      style={[
        styles.statusDot,
        {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: status === 'online' ? darkColors.primary : darkColors.text4,
          bottom: 0,
          right: 0,
        },
      ]}
    />
  );
}

export function Avatar({ name, size = 'md', color, imageUrl, showStatus, style }: AvatarProps) {
  const numericSize = typeof size === 'number' ? size : SIZE_MAP[size];
  const ringColor = color ?? RING_COLORS[hashIndex(name)] ?? '#00e676';
  const initials = getInitials(name);
  const fontSize = Math.floor(numericSize * 0.35);
  const ringWidth = Math.max(2, numericSize * 0.055);
  const innerSize = numericSize - ringWidth * 2 - 2;

  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={[
          styles.ring,
          {
            width: numericSize,
            height: numericSize,
            borderRadius: numericSize / 2,
            borderColor: ringColor,
            borderWidth: ringWidth,
            shadowColor: ringColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: numericSize * 0.2,
          },
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: `${ringColor}25`,
              overflow: 'hidden',
            },
          ]}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: innerSize, height: innerSize }}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <Text style={[styles.initials, { fontSize, color: ringColor }]}>{initials}</Text>
          )}
        </View>
      </View>
      {showStatus ? <StatusDot status={showStatus} size={numericSize} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: 'Inter_700Bold',
  },
  statusDot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: darkColors.bg1,
  },
});
