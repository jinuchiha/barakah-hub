import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Payment } from '@/types';
import { ReceiptSlipModal } from './ReceiptSlipModal';
import { ReceiptImageModal } from './ReceiptImageModal';
import { Badge, type BadgeVariant } from './ui/Badge';
import { formatPKR, formatDate } from '@/lib/format';
import { MoneyText } from './ui/MoneyText';
import { useTheme } from '@/lib/useTheme';
import { poolColor } from '@/lib/pool';
import { spacing, radius } from '@/lib/theme';
import { haptic } from '@/lib/haptics';

/**
 * One transaction in the financial timeline.
 *
 * Design rules this component exists to enforce:
 *  · ONE primary line (amount), one metadata line — no icon pile-ups.
 *  · Secondary actions (receipt image, verified digital slip) live in a
 *    detail sheet, not on the row.
 *  · Intrinsic height only — a row can never stretch to fill a viewport.
 *    (Its predecessor laid its children out in a single flex ROW, which is
 *    how receipt strips ended up beside the amount and the card's geometry
 *    became unpredictable inside virtualized lists.)
 */

const POOL_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  sadaqah: 'hand-heart',
  zakat: 'star-crescent',
  qarz: 'handshake',
};

type RowStatus = { label: string; variant: BadgeVariant; pulse: boolean; exceptional: boolean };

function statusOf(payment: Payment): RowStatus {
  if (payment.pendingVerify) {
    if (payment.supervisorRejectedAt) return { label: 'Rejected', variant: 'danger', pulse: false, exceptional: true };
    return { label: 'Pending', variant: 'warning', pulse: true, exceptional: true };
  }
  if (payment.verifiedAt) return { label: 'Verified', variant: 'success', pulse: false, exceptional: false };
  return { label: 'Rejected', variant: 'danger', pulse: false, exceptional: true };
}

function DetailLine({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.detailLine}>
      <Text style={[styles.detailLabel, { color: colors.text3 }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text1 }]}>{value}</Text>
    </View>
  );
}

function TransactionDetailSheet({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const { colors } = useTheme();
  const [showSlip, setShowSlip] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const status = statusOf(payment);
  const accent = poolColor(payment.pool, colors);
  const poolLabel = payment.pool.charAt(0).toUpperCase() + payment.pool.slice(1);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close details">
        <Pressable style={[styles.sheet, { backgroundColor: colors.bg2, borderColor: colors.border1 }]} onPress={() => {}}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border2 }]} />
          <View style={[styles.sheetIcon, { backgroundColor: `${accent}16` }]}>
            <MaterialCommunityIcons name={POOL_ICONS[payment.pool] ?? 'cash'} size={22} color={accent} />
          </View>
          <MoneyText amount={payment.amount} size="lg" color={colors.text1} />
          <View style={styles.sheetBadgeRow}>
            <Badge label={status.label} variant={status.variant} pulse={status.pulse} />
          </View>

          <View style={[styles.detailBlock, { borderColor: colors.border1 }]}>
            <DetailLine label="Contribution month" value={payment.monthLabel} />
            <DetailLine label="Paid on" value={payment.paidOn ? formatDate(payment.paidOn) : '—'} />
            <DetailLine label="Pool" value={poolLabel} />
            {payment.verifiedAt ? <DetailLine label="Verified on" value={formatDate(payment.verifiedAt)} /> : null}
            {payment.note ? <DetailLine label="Note" value={payment.note} /> : null}
          </View>

          {payment.receiptUrl ? (
            <TouchableOpacity
              style={[styles.actionRow, { borderColor: colors.border1 }]}
              onPress={() => setShowReceipt(true)}
              accessibilityRole="button"
              accessibilityLabel="View uploaded receipt image"
            >
              <MaterialCommunityIcons name="file-image-outline" size={18} color={colors.text2} />
              <Text style={[styles.actionText, { color: colors.text1 }]}>View uploaded receipt</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.text4} />
            </TouchableOpacity>
          ) : null}
          {payment.verifiedAt ? (
            <TouchableOpacity
              style={[styles.actionRow, { borderColor: colors.border1 }]}
              onPress={() => setShowSlip(true)}
              accessibilityRole="button"
              accessibilityLabel="Open verified digital receipt"
            >
              <MaterialCommunityIcons name="qrcode-scan" size={18} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.text1 }]}>Digital receipt (verified)</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.text4} />
            </TouchableOpacity>
          ) : null}

          {showSlip ? <ReceiptSlipModal payment={payment} onClose={() => setShowSlip(false)} /> : null}
          {showReceipt && payment.receiptUrl ? (
            <ReceiptImageModal url={payment.receiptUrl} onClose={() => setShowReceipt(false)} />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function TransactionRow({ payment }: { payment: Payment }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const status = statusOf(payment);
  const accent = poolColor(payment.pool, colors);
  const paidLine = payment.paidOn ? formatDate(payment.paidOn) : 'Awaiting payment';
  const statusColor =
    status.variant === 'success' ? colors.success
    : status.variant === 'warning' ? colors.warning
    : colors.danger;

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: pressed ? colors.bg3 : colors.bg1,
            borderColor: colors.border1,
            borderLeftColor: statusColor,
            borderLeftWidth: 3,
          },
        ]}
        onPress={() => { void haptic.tap(); setOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={`${payment.pool} payment, ${formatPKR(payment.amount)}, ${status.label}. Opens details.`}
      >
        <View style={[styles.icon, { backgroundColor: `${accent}14` }]}>
          <MaterialCommunityIcons name={POOL_ICONS[payment.pool] ?? 'cash'} size={18} color={accent} />
        </View>
        <View style={styles.middle}>
          <Text style={[styles.title, { color: colors.text1 }]} numberOfLines={1}>{payment.monthLabel}</Text>
          <Text style={[styles.meta, { color: colors.text4 }]} numberOfLines={1}>
            {paidLine} · {payment.pool}
          </Text>
        </View>
        <View style={styles.right}>
          <MoneyText amount={payment.amount} size="md" color={colors.text1} />
          {status.exceptional ? (
            <Badge label={status.label} variant={status.variant} pulse={status.pulse} />
          ) : null}
        </View>
      </Pressable>
      {open ? <TransactionDetailSheet payment={payment} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    minHeight: 64,
  },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  meta: { fontSize: 11.5, fontFamily: 'Inter_400Regular', marginTop: 2, textTransform: 'capitalize' },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 15, fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1,
    paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 36, alignItems: 'center',
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, marginBottom: spacing.md },
  sheetIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  sheetAmount: { fontSize: 28, fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] },
  sheetBadgeRow: { marginTop: 6, marginBottom: spacing.md },
  detailBlock: { alignSelf: 'stretch', borderTopWidth: 1, paddingTop: spacing.sm, marginBottom: spacing.sm },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  detailLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  detailValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold', maxWidth: '60%', textAlign: 'right' },
  actionRow: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 13, borderTopWidth: 1,
  },
  actionText: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
