import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, RefreshControl, ScrollView,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { haptic } from '@/lib/haptics';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import {
  useAllPayments, useVerifyPayment, useRejectPayment,
  useSupervisorApprovePayment, useSupervisorRejectPayment, useResendPayment,
} from '@/hooks/usePayments';
import { useAuthStore } from '@/stores/auth.store';
import { isAdminOnly } from '@/lib/roles';
import { poolColor } from '@/lib/pool';
import { formatPKR, formatDate } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import { paymentQueueState, type Payment, type PaymentQueueState } from '@/types';

interface CardActions {
  onApprove: () => void;
  onSupervisorReject: () => void;
  onVerify: () => void;
  onResend: () => void;
  onDelete: () => void;
}

function QueuePaymentCard({
  payment, state, isAdmin, actions,
}: {
  payment: Payment;
  state: PaymentQueueState;
  isAdmin: boolean;
  actions: CardActions;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const memberName = payment.member?.nameEn ?? 'Member';
  const stripe = poolColor(payment.pool, colors);

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.poolStripe, { backgroundColor: stripe }]} />
      <View style={styles.cardInner}>
        <View style={styles.cardHeader}>
          <Avatar name={memberName} color={payment.member?.color} size="sm" />
          <View style={styles.cardInfo}>
            <Text style={[styles.memberName, { color: colors.text1 }]}>{memberName}</Text>
            <Text style={[styles.month, { color: colors.text3 }]}>{payment.monthLabel}</Text>
          </View>
          <View style={styles.amountBlock}>
            <Text style={[styles.amount, { color: stripe }]}>{formatPKR(payment.amount)}</Text>
            <Text style={[styles.poolLabel, { color: colors.text4 }]}>{payment.pool.toUpperCase()}</Text>
          </View>
        </View>

        {payment.note ? (
          <View style={[styles.noteRow, { backgroundColor: colors.glass1 }]}>
            <MaterialCommunityIcons name="note-text-outline" size={13} color={colors.text4} />
            <Text style={[styles.note, { color: colors.text3 }]}>{payment.note}</Text>
          </View>
        ) : null}

        {state === 'rejected' && payment.supervisorRejectionNote ? (
          <View style={[styles.noteRow, { backgroundColor: colors.dangerDim }]}>
            <MaterialCommunityIcons name="alert-outline" size={13} color={colors.danger} />
            <Text style={[styles.note, { color: colors.danger }]}>
              Supervisor: {payment.supervisorRejectionNote}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.submitDate, { color: colors.text4 }]}>Submitted {formatDate(payment.createdAt)}</Text>

        {/* Awaiting supervisor → supervisor (or admin) approves/rejects */}
        {state === 'awaiting-supervisor' ? (
          <View style={styles.actionRow}>
            <Button label={t('admin.reject')} onPress={actions.onSupervisorReject} variant="danger" size="sm" style={styles.actionBtn} />
            <Button label={t('admin.approve')} onPress={actions.onApprove} variant="solid" size="sm" style={styles.actionBtn} />
          </View>
        ) : null}

        {/* Awaiting admin final verification */}
        {state === 'awaiting-admin' ? (
          isAdmin ? (
            <View style={styles.actionRow}>
              <Button label={t('admin.reject')} onPress={actions.onDelete} variant="danger" size="sm" style={styles.actionBtn} />
              <Button label={t('admin.verify')} onPress={actions.onVerify} variant="solid" size="sm" style={styles.actionBtn} />
            </View>
          ) : (
            <Text style={[styles.statusHint, { color: colors.text4 }]}>✓ Approved · awaiting admin verification</Text>
          )
        ) : null}

        {/* Supervisor-rejected → admin resends or deletes */}
        {state === 'rejected' ? (
          isAdmin ? (
            <View style={styles.actionRow}>
              <Button label={t('admin.delete')} onPress={actions.onDelete} variant="danger" size="sm" style={styles.actionBtn} />
              <Button label={t('admin.resend')} onPress={actions.onResend} variant="solid" size="sm" style={styles.actionBtn} />
            </View>
          ) : (
            <Text style={[styles.statusHint, { color: colors.danger }]}>✗ Rejected · admin will resend or delete</Text>
          )
        ) : null}
      </View>
    </GlassCard>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const { colors } = useTheme();
  if (count === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text4 }]}>{title} · {count}</Text>
      {children}
    </View>
  );
}

export default function PaymentsReviewScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const isAdmin = isAdminOnly(user?.role);
  const { data, isLoading, refetch, isRefetching, error } = useAllPayments();

  const verifyMutation = useVerifyPayment();
  const rejectMutation = useRejectPayment();
  const approveMutation = useSupervisorApprovePayment();
  const supRejectMutation = useSupervisorRejectPayment();
  const resendMutation = useResendPayment();

  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const pending = data?.filter((p) => p.pendingVerify) ?? [];
  const awaitingSupervisor = pending.filter((p) => paymentQueueState(p) === 'awaiting-supervisor');
  const awaitingAdmin = pending.filter((p) => paymentQueueState(p) === 'awaiting-admin');
  const rejected = pending.filter((p) => paymentQueueState(p) === 'rejected');

  const run = async (fn: () => Promise<unknown>, onDone: () => void, onFail?: () => void) => {
    try {
      await fn();
      onDone();
    } catch (err) {
      onFail?.();
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('admin.actionFailed'));
    }
  };

  const handleApprove = (p: Payment) =>
    Alert.alert(t('admin.approvePayment'), t('admin.approvePaymentConfirm', { amount: formatPKR(p.amount), month: p.monthLabel }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('admin.approve'), onPress: () => run(() => approveMutation.mutateAsync(p.id), () => void haptic.confirm(), () => void haptic.error()) },
    ]);

  const handleVerify = (p: Payment) =>
    Alert.alert(t('admin.verifyPayment'), t('admin.verifyPaymentConfirm', { amount: formatPKR(p.amount) }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('admin.verify'), onPress: () => run(() => verifyMutation.mutateAsync(p.id), () => void haptic.confirm(), () => void haptic.error()) },
    ]);

  const handleResend = (p: Payment) =>
    run(() => resendMutation.mutateAsync(p.id), () => void haptic.confirm(), () => void haptic.error());

  const handleDelete = (p: Payment) =>
    Alert.alert(t('admin.deletePayment'), t('admin.deletePaymentConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('admin.delete'), style: 'destructive', onPress: () => run(() => rejectMutation.mutateAsync(p.id), () => void haptic.destructive(), () => void haptic.error()) },
    ]);

  const confirmSupervisorReject = () => {
    if (!rejectTarget) return;
    if (rejectNote.trim().length < 5) {
      Alert.alert('Note required', 'Please explain why you are rejecting this payment (min 5 characters).');
      return;
    }
    const p = rejectTarget;
    const note = rejectNote.trim();
    setRejectTarget(null);
    setRejectNote('');
    void run(() => supRejectMutation.mutateAsync({ paymentId: p.id, note }), () => void haptic.destructive(), () => void haptic.error());
  };

  const makeActions = (p: Payment): CardActions => ({
    onApprove: () => handleApprove(p),
    onSupervisorReject: () => setRejectTarget(p),
    onVerify: () => handleVerify(p),
    onResend: () => handleResend(p),
    onDelete: () => handleDelete(p),
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['bottom']}>
      {isLoading ? (
        <EmptyState icon="loading" title={t('admin.loadingPayments')} />
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title={t('common.error')} subtitle="Pull to retry" />
      ) : pending.length === 0 ? (
        <EmptyState icon="cash-check" title={t('admin.allVerified')} subtitle={t('admin.noPendingReview')} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandGold} colors={[colors.brandGold]} progressBackgroundColor={colors.bg2} />}
        >
          <Section title={t('admin.awaitingSupervisor')} count={awaitingSupervisor.length}>
            {awaitingSupervisor.map((p) => (
              <QueuePaymentCard key={p.id} payment={p} state="awaiting-supervisor" isAdmin={isAdmin} actions={makeActions(p)} />
            ))}
          </Section>
          <Section title={t('admin.awaitingAdminVerification')} count={awaitingAdmin.length}>
            {awaitingAdmin.map((p) => (
              <QueuePaymentCard key={p.id} payment={p} state="awaiting-admin" isAdmin={isAdmin} actions={makeActions(p)} />
            ))}
          </Section>
          <Section title={t('admin.rejectedBySupervisor')} count={rejected.length}>
            {rejected.map((p) => (
              <QueuePaymentCard key={p.id} payment={p} state="rejected" isAdmin={isAdmin} actions={makeActions(p)} />
            ))}
          </Section>
        </ScrollView>
      )}

      <Modal visible={rejectTarget !== null} transparent animationType="fade" onRequestClose={() => { setRejectTarget(null); setRejectNote(''); }}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <GlassCard style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: colors.text1 }]}>{t('admin.rejectPayment')}</Text>
            <Text style={[styles.modalSub, { color: colors.text3 }]}>
              {t('admin.rejectPaymentNote')}
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text1, borderColor: colors.border1, backgroundColor: colors.glass1 }]}
              placeholder="e.g. amount doesn't match the receipt"
              placeholderTextColor={colors.text4}
              value={rejectNote}
              onChangeText={setRejectNote}
              multiline
              maxLength={500}
            />
            <View style={styles.actionRow}>
              <Button label={t('common.cancel')} onPress={() => { setRejectTarget(null); setRejectNote(''); }} variant="primary" size="sm" style={styles.actionBtn} />
              <Button label={t('admin.reject')} onPress={confirmSupervisorReject} variant="danger" size="sm" style={styles.actionBtn} loading={supRejectMutation.isPending} disabled={supRejectMutation.isPending} />
            </View>
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: spacing.md, paddingBottom: 80 },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, marginBottom: spacing.sm },
  card: { marginBottom: spacing.sm, flexDirection: 'row', overflow: 'hidden' },
  poolStripe: { width: 4 },
  cardInner: { flex: 1, padding: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  cardInfo: { flex: 1 },
  memberName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  month: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  amountBlock: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontFamily: 'SpaceMono_400Regular', fontWeight: '700' },
  poolLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  noteRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 4,
    padding: spacing.sm, borderRadius: radius.xs, marginBottom: spacing.sm,
  },
  note: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },
  submitDate: { fontSize: 11, fontFamily: 'Inter_400Regular', marginBottom: spacing.sm },
  statusHint: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: spacing.lg },
  modalCard: { padding: spacing.lg },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: spacing.xs },
  modalSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: spacing.md },
  modalInput: {
    borderWidth: 1, borderRadius: radius.sm, padding: spacing.md,
    fontSize: 14, fontFamily: 'Inter_400Regular', minHeight: 80,
    textAlignVertical: 'top', marginBottom: spacing.md,
  },
});
