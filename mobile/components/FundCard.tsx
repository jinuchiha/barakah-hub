import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProgressBar } from './ui/ProgressBar';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius, darkColors } from '@/lib/theme';

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
    gradientStart: 'rgba(0,230,118,0.25)',
    gradientEnd: 'rgba(0,230,118,0.04)',
    glow: darkColors.shadowGreen,
    borderColor: darkColors.primary,
  },
  zakat: {
    icon: 'star-crescent' as const,
    gradientStart: 'rgba(68,138,255,0.25)',
    gradientEnd: 'rgba(68,138,255,0.04)',
    glow: darkColors.shadowBlue,
    borderColor: darkColors.accent,
  },
  qarz: {
    icon: 'handshake' as const,
    gradientStart: 'rgba(255,215,64,0.25)',
    gradientEnd: 'rgba(255,215,64,0.04)',
    glow: darkColors.shadowGold,
    borderColor: darkColors.gold,
  },
};

function useCountUp(target: number) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1200;
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
      style={[animStyle, styles.outer, {
        borderColor: cfg.borderColor,
        shadowColor: cfg.glow,
      }]}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 400 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
      >
        <LinearGradient
          colors={[cfg.gradientStart, cfg.gradientEnd]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={styles.content}>
          <View style={[styles.iconBox, { backgroundColor: `${cfg.borderColor}20` }]}>
            <MaterialCommunityIcons name={cfg.icon} size={22} color={cfg.borderColor} />
          </View>
          <Text style={[styles.label, { color: colors.text3 }]}>{label}</Text>
          <Text style={[styles.amount, { color: cfg.borderColor }]}>
            PKR {displayAmount.toLocaleString('en-PK')}
          </Text>
          {target ? (
            <View style={styles.progressSection}>
              <ProgressBar
                progress={progress}
                color={cfg.borderColor}
                height={4}
                showGlow
                style={styles.progressBar}
              />
              <Text style={[styles.progressLabel, { color: colors.text4 }]}>
                {Math.round(progress * 100)}% of target
              </Text>
            </View>
          ) : null}
        </View>
        {onViewHistory ? (
          <Pressable onPress={onViewHistory} style={styles.historyBtn}>
            <Text style={[styles.historyText, { color: cfg.borderColor }]}>View History</Text>
            <MaterialCommunityIcons name="chevron-right" size={14} color={cfg.borderColor} />
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 280,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginRight: spacing.md,
    backgroundColor: darkColors.bg2,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    padding: spacing.lg,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  amount: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  progressSection: {
    marginTop: spacing.md,
  },
  progressBar: {
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: 2,
  },
  historyText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
});
