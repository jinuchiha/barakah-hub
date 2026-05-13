import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProgressBar } from './ui/ProgressBar';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

interface FundCardProps {
  pool: 'sadaqah' | 'zakat' | 'qarz';
  amount: number;
  label: string;
  target?: number;
  onViewHistory?: () => void;
}

const POOL_CONFIG = {
  sadaqah: {
    icon: 'hand-heart' as const,
    accent: '#2d8a5f',
  },
  zakat: {
    icon: 'star-crescent' as const,
    accent: '#608dd7',
  },
  qarz: {
    icon: 'handshake' as const,
    accent: '#c89b3c',
  },
};

function useCountUp(target: number) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const start = Date.now();

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };

    const frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return display;
}

export function FundCard({ pool, amount, label, target, onViewHistory }: FundCardProps) {
  const { colors } = useTheme();
  const cfg = POOL_CONFIG[pool];
  const displayAmount = useCountUp(amount);
  const scale = useSharedValue(1);
  const progress = target && target > 0 ? amount / target : 0;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        styles.outer,
        { backgroundColor: colors.bg1, borderColor: colors.border1 },
      ]}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.985, { damping: 20, stiffness: 400 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 20, stiffness: 400 }); }}
      >
        <View style={[styles.rail, { backgroundColor: cfg.accent }]} pointerEvents="none" />

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={[styles.label, { color: colors.text3 }]}>{label}</Text>
            <View style={[styles.iconBox, { backgroundColor: `${cfg.accent}1F` }]}>
              <MaterialCommunityIcons name={cfg.icon} size={16} color={cfg.accent} />
            </View>
          </View>

          <Text style={[styles.amount, { color: colors.text1 }]} numberOfLines={1}>
            <Text style={[styles.amountUnit, { color: colors.text3 }]}>PKR </Text>
            {displayAmount.toLocaleString('en-PK')}
          </Text>

          {target ? (
            <View style={styles.progressSection}>
              <ProgressBar
                progress={progress}
                color={cfg.accent}
                height={3}
                style={styles.progressBar}
              />
              <Text style={[styles.progressLabel, { color: colors.text4 }]}>
                {Math.round(progress * 100)}% of target
              </Text>
            </View>
          ) : null}
        </View>

        {onViewHistory ? (
          <Pressable
            onPress={onViewHistory}
            style={[styles.historyBtn, { borderTopColor: colors.border1 }]}
          >
            <Text style={[styles.historyText, { color: colors.text2 }]}>View history</Text>
            <MaterialCommunityIcons name="chevron-right" size={14} color={colors.text3} />
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 260,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: spacing.sm + 4,
    position: 'relative',
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  content: {
    padding: spacing.md,
    paddingLeft: spacing.md + 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  amount: {
    fontSize: 24,
    fontFamily: 'SpaceMono_400Regular',
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  amountUnit: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  progressSection: {
    marginTop: spacing.md,
  },
  progressBar: {
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 10.5,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.4,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    gap: 2,
  },
  historyText: {
    fontSize: 11.5,
    fontFamily: 'Inter_600SemiBold',
  },
});
