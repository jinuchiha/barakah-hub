import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { EmergencyCase } from '@/types';
import { Button } from './ui/Button';
import { formatPKR } from '@/lib/format';
import { darkColors as colors, radius, spacing } from '@/lib/theme';

interface VoteModalProps {
  visible: boolean;
  emergencyCase: EmergencyCase | null;
  voteDirection: boolean | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function VoteModal({
  visible,
  emergencyCase,
  voteDirection,
  onConfirm,
  onCancel,
  loading = false,
}: VoteModalProps) {
  if (!emergencyCase) return null;

  const isYes = voteDirection === true;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Confirm Your Vote</Text>

          <View style={[styles.voteIndicator, isYes ? styles.yesIndicator : styles.noIndicator]}>
            <MaterialCommunityIcons
              name={isYes ? 'thumb-up' : 'thumb-down'}
              size={32}
              color={isYes ? colors.primary : colors.danger}
            />
            <Text style={[styles.voteText, { color: isYes ? colors.primary : colors.danger }]}>
              {isYes ? 'APPROVE' : 'REJECT'}
            </Text>
          </View>

          <View style={styles.caseInfo}>
            <Text style={styles.caseLabel}>Beneficiary</Text>
            <Text style={styles.caseValue}>{emergencyCase.beneficiaryName}</Text>
            <Text style={styles.caseLabel}>Requested Amount</Text>
            <Text style={[styles.caseValue, { color: colors.gold }]}>
              {formatPKR(emergencyCase.amount)}
            </Text>
            <Text style={styles.caseLabel}>Reason</Text>
            <Text style={styles.caseValue} numberOfLines={3}>{emergencyCase.reasonEn}</Text>
          </View>

          <Text style={styles.warning}>
            This vote is final and cannot be changed.
          </Text>

          <View style={styles.buttons}>
            <Button label="Cancel" onPress={onCancel} variant="ghost" style={styles.btn} />
            <Button
              label={`Confirm ${isYes ? 'Approve' : 'Reject'}`}
              onPress={onConfirm}
              variant={isYes ? 'primary' : 'danger'}
              loading={loading}
              style={styles.btn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg2,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: colors.border1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text1,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  voteIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
  },
  yesIndicator: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  noIndicator: { backgroundColor: colors.dangerDim, borderColor: colors.danger },
  voteText: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  caseInfo: {
    backgroundColor: colors.glass1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  caseLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
  },
  caseValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text1,
    marginTop: 2,
  },
  warning: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.text4,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: { flex: 1 },
});
