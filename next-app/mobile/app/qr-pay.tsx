import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Share, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import { useAuthStore } from '@/stores/auth.store';
import { QRCode } from '@/components/QRCode';
import { QRScanner } from '@/components/QRScanner';
import { buildMemberQR, decodeQR } from '@/lib/qr';

type Tab = 'my-qr' | 'scan';

export default function QRPayScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('my-qr');

  const memberQR = user ? buildMemberQR(user.id, user.nameEn) : '';

  const handleShare = async () => {
    try {
      await Share.share({ message: `Barakah Hub Member: ${user?.nameEn ?? ''}\nID: ${user?.id ?? ''}` });
    } catch {
      // dismissed
    }
  };

  const handleScan = (data: string) => {
    const decoded = decodeQR(data);
    if (!decoded) {
      Alert.alert('Invalid QR', 'This QR code is not from Barakah Hub.');
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (decoded.type === 'member') {
      Alert.alert('Member Found', `${decoded.name}\nID: ${decoded.id}`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else if (decoded.type === 'invite') {
      Alert.alert('Join Code', `Code: ${decoded.code}`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text1} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>QR Code</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.glass2 }]}>
        {(['my-qr', 'scan'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { backgroundColor: colors.primary }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, { color: tab === t ? '#000' : colors.text3 }]}>
              {t === 'my-qr' ? 'My QR Code' : 'Scan QR'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'my-qr' ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.qrView}>
          <View style={[styles.card, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}>
            <Text style={[styles.nameText, { color: colors.text1 }]}>{user?.nameEn}</Text>
            <Text style={[styles.idText, { color: colors.text4 }]}>
              #{user?.id.slice(0, 8).toUpperCase()}
            </Text>
            <View style={styles.qrWrap}>
              <QRCode value={memberQR} size={200} />
            </View>
            <Text style={[styles.hint, { color: colors.text3 }]}>
              Share this code to let others find you quickly
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: colors.primary }]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="share-variant" size={18} color="#000" />
            <Text style={styles.shareBtnText}>Share My QR</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <QRScanner onScan={handleScan} onCancel={() => router.back()} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  tabs: {
    flexDirection: 'row',
    margin: spacing.md,
    borderRadius: radius.xxl,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  tabText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  qrView: { flex: 1, padding: spacing.md, gap: spacing.md },
  card: {
    padding: spacing.xl,
    borderRadius: radius.xxl,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameText: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  idText: { fontSize: 12, fontFamily: 'SpaceMono_400Regular' },
  qrWrap: { marginVertical: spacing.md },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
    borderRadius: radius.xl,
  },
  shareBtnText: { color: '#000', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
