import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { EmergencyCase } from '@/types';
import { Badge } from './ui/Badge';
import { ProgressBar } from './ui/ProgressBar';
import { GlassCard } from './ui/GlassCard';
import { Avatar } from './ui/Avatar';
import { formatPKR, formatDate } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface CaseCardProps {
  emergencyCase: EmergencyCase;
  onPress?: () => void;
  onVoteYes?: () => void;
  onVoteNo?: () => void;
  isOwn?: boolean;
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  voting: 'warning',
  approved: 'success',
  rejected: 'danger',
  disbursed: 'info',
};

function VoteButtons({
  onVoteYes,
  onVoteNo,
  colors,
}: {
  onVoteYes: () => void;
  onVoteNo: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.voteButtons}>
      <Pressable
        style={[styles.voteBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}
        onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onVoteYes(); }}
      >
        <MaterialCommunityIcons name="thumb-up" size={16} color={colors.primary} />
        <Text style={[styles.voteBtnText, { color: colors.primary }]}>Approve</Text>
      </Pressable>
      <Pressable
        style={[styles.voteBtn, { backgroundColor: colors.dangerDim, borderColor: colors.danger }]}
        onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onVoteNo(); }}
      >
        <MaterialCommunityIcons name="thumb-down" size={16} color={colors.danger} />
        <Text style={[styles.voteBtnText, { color: colors.danger }]}>Reject</Text>
      </Pressable>
    </View>
  );
}

function VoteProgress({
  yes,
  no,
  total,
  colors,
}: {
  yes: number;
  no: number;
  total: number;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const safeTotal = total || 1;
  return (
    <View style={styles.voteProgress}>
      <View style={styles.voteCountRow}>
        <Text style={[styles.voteCount, { color: colors.primary }]}>{yes} Yes</Text>
        <Text style={[styles.voteCount, { color: colors.text3 }]}> · </Text>
        <Text style={[styles.voteCount, { color: colors.danger }]}>{no} No</Text>
        <Text style={[styles.voteCount, { color: colors.text3 }]}> · {total - yes - no} Pending</Text>
      </View>
      <ProgressBar progress={yes / safeTotal} color={colors.primary} height={5} showGlow style={styles.progressBar} />
    </View>
  );
}

export function CaseCard({ emergencyCase: c, onPress, onVoteYes, onVoteNo, isOwn = false }: CaseCardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const yes = c.yesVotes ?? 0;
  const no = c.noVotes ?? 0;
  const total = c.totalEligible ?? 1;
  const hasVoted = c.myVote !== null && c.myVote !== undefined;
  const topBorderColor = c.emergency ? colors.danger : colors.gold;
  const glowColor = c.emergency ? colors.dangerDim : colors.goldDim;

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 15, stiffness: 400 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
        onPress={onPress}
      >
        <GlassCard style={[styles.card, { borderTopColor: topBorderColor, borderTopWidth: 3 }]} glowColor={glowColor}>
          <View style={styles.header}>
            <View style={styles.avatarRow}>
              <Avatar name={c.beneficiaryName} size="sm" />
              <View style={styles.headerText}>
                <Text style={[styles.beneficiary, { color: colors.text1 }]} numberOfLines={1}>
                  {c.beneficiaryName}
                </Text>
                <Text style={[styles.date, { color: colors.text4 }]}>{formatDate(c.createdAt)}</Text>
              </View>
            </View>
            <Badge
              label={c.status}
              variant={STATUS_VARIANT[c.status] ?? 'neutral'}
              pulse={c.status === 'voting'}
            />
          </View>

          <Text style={[styles.reason, { color: colors.text2 }]} numberOfLines={2}>{c.reasonEn}</Text>

          <Text style={[styles.amount, { color: colors.gold }]}>{formatPKR(c.amount)}</Text>

          {c.status === 'voting' ? (
            <VoteProgress yes={yes} no={no} total={total} colors={colors} />
          ) : null}

          {c.status === 'voting' && !isOwn && !hasVoted && onVoteYes && onVoteNo ? (
            <VoteButtons onVoteYes={onVoteYes} onVoteNo={onVoteNo} colors={colors} />
          ) : null}

          {hasVoted && c.status === 'voting' ? (
            <View style={[styles.votedRow, { backgroundColor: colors.glass1 }]}>
              <MaterialCommunityIcons name="check-circle" size={14} color={colors.primary} />
              <Text style={[styles.votedText, { color: colors.text3 }]}>
                You voted: {c.myVote ? 'Approve' : 'Reject'}
              </Text>
            </View>
          ) : null}
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  beneficiary: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  date: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  reason: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  amount: {
    fontSize: 16,
    fontFamily: 'SpaceMono_400Regular',
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  voteProgress: {
    marginBottom: spacing.sm,
  },
  voteCountRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  voteCount: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  progressBar: {
    marginTop: 2,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  voteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1.5,
    gap: 6,
  },
  voteBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  votedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  votedText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
