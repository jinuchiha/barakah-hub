import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Share, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Payment } from '@/types';
import { formatPKR, formatDate } from '@/lib/format';
import { DUA_KIND_LABEL, randomDua } from '@/lib/duas';
import { haptic } from '@/lib/haptics';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://barakah-hub.vercel.app';

/**
 * The emailed gold slip, in-app: ﷽ band, amount, QR (scans to the public
 * verification page), a sourced dua, and a share button. Only rendered
 * for verified payments.
 */
export function ReceiptSlipModal({ payment, onClose }: { payment: Payment | null; onClose: () => void }) {
  const dua = React.useMemo(() => randomDua(), []);
  if (!payment) return null;
  const receiptNo = payment.id.slice(0, 8).toUpperCase();
  const verifyUrl = `${BASE}/verify-receipt/${payment.id}`;

  const share = async () => {
    void haptic.tap();
    try {
      await Share.share({
        message: `Barakah Hub receipt #${receiptNo} · ${formatPKR(payment.amount)} (${payment.pool}) · ${payment.monthLabel}\nVerify: ${verifyUrl}`,
      });
    } catch {
      // user dismissed the share sheet
    }
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(220)} style={styles.veil}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <Animated.View entering={FadeInDown.duration(360).springify().damping(16)} style={styles.card}>
          <LinearGradient colors={['#141b2c', '#0f1626', '#1a1408']} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 1 }} style={StyleSheet.absoluteFillObject} />
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* ﷽ band */}
            <View style={styles.band}>
              <Text style={styles.bismillah}>﷽</Text>
              <Text style={styles.bandLabel}>BARAKAH HUB · OFFICIAL RECEIPT</Text>
            </View>

            <View style={styles.bodyRow}>
              <View style={styles.left}>
                <Text style={styles.receiptNo}>Receipt <Text style={styles.receiptNoGold}>#{receiptNo}</Text></Text>
                <Text style={styles.amount}>{formatPKR(payment.amount)}</Text>
                <Text style={styles.meta}>{payment.pool.toUpperCase()} · {payment.monthLabel}</Text>
                {payment.verifiedAt ? (
                  <Text style={styles.metaSub}>Verified {formatDate(payment.verifiedAt)}</Text>
                ) : null}
              </View>
              <View style={styles.qrBox}>
                <Image
                  source={{ uri: `${BASE}/api/receipt-qr/${payment.id}` }}
                  style={styles.qr}
                  contentFit="contain"
                  transition={250}
                />
                <Text style={styles.qrHint}>scan to verify</Text>
              </View>
            </View>

            {/* Dua band */}
            <View style={styles.duaBand}>
              <Text style={styles.ornament}>۞</Text>
              <Text style={styles.duaArabic}>{dua.arabic}</Text>
              <Text style={styles.duaUrdu}>{dua.urdu}</Text>
              <Text style={styles.duaSource}>{DUA_KIND_LABEL[dua.type].en} · {dua.source}</Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.shareBtn} onPress={share} accessibilityRole="button">
                <MaterialCommunityIcons name="share-variant" size={16} color="#0a0f1a" />
                <Text style={styles.shareText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button">
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  veil: { flex: 1, backgroundColor: 'rgba(4,7,12,0.9)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    width: '100%', maxWidth: 400, maxHeight: '88%', borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: '#8a6d2f',
  },
  band: {
    alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(200,155,60,0.35)',
    backgroundColor: 'rgba(200,155,60,0.08)',
  },
  bismillah: { fontSize: 22, color: '#d9b04c' },
  bandLabel: { marginTop: 6, fontSize: 9, letterSpacing: 3, color: '#a08748', fontFamily: 'Inter_700Bold' },
  bodyRow: { flexDirection: 'row', padding: 18, gap: 14 },
  left: { flex: 1 },
  receiptNo: { fontSize: 11, color: '#94a3b8', fontFamily: 'Inter_400Regular' },
  receiptNoGold: { color: '#d9b04c', fontFamily: 'SpaceMono_400Regular' },
  amount: { marginTop: 8, fontSize: 30, color: '#e8c563', fontFamily: 'Inter_700Bold', letterSpacing: -0.8 },
  meta: { marginTop: 8, fontSize: 12, color: '#cbd5e1', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  metaSub: { marginTop: 4, fontSize: 11, color: '#94a3b8', fontFamily: 'Inter_400Regular' },
  qrBox: { alignItems: 'center' },
  qr: { width: 108, height: 108, borderRadius: 10, backgroundColor: '#f8f5ec' },
  qrHint: { marginTop: 5, fontSize: 9, color: '#a08748', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'Inter_600SemiBold' },
  duaBand: {
    marginHorizontal: 18, marginBottom: 4, paddingVertical: 14, paddingHorizontal: 12,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(200,155,60,0.25)',
    alignItems: 'center',
  },
  ornament: { fontSize: 18, color: '#d9b04c', marginBottom: 8 },
  duaArabic: { fontSize: 17, color: '#f2ecd9', textAlign: 'center', lineHeight: 32, writingDirection: 'rtl' },
  duaUrdu: { marginTop: 8, fontSize: 12, color: 'rgba(236,235,230,0.7)', textAlign: 'center', lineHeight: 26, writingDirection: 'rtl', fontFamily: 'NotoNastaliqUrdu_400Regular' },
  duaSource: { marginTop: 8, fontSize: 10, color: 'rgba(200,155,60,0.7)', letterSpacing: 1, textTransform: 'uppercase' },
  actions: { flexDirection: 'row', gap: 10, padding: 18, paddingTop: 12 },
  shareBtn: {
    flex: 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#d9b04c', borderRadius: 12, paddingVertical: 12,
  },
  shareText: { color: '#0a0f1a', fontSize: 14, fontFamily: 'Inter_700Bold' },
  closeBtn: {
    paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(214,210,199,0.2)',
  },
  closeText: { color: '#cbd5e1', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
