import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FaqItem { q: string; a: string }

const FAQ: FaqItem[] = [
  {
    q: 'How do I submit a payment?',
    a: 'Open the Payments tab → tap the + button → fill in the amount, choose the fund pool (Sadaqah / Zakat / Qarz), pick the month, and optionally attach a screenshot. Tap Submit. An admin will verify it shortly.',
  },
  {
    q: 'Why is my payment "Pending"?',
    a: 'New payments are visible to admins for verification. Once an admin reviews the screenshot or confirms the deposit, the status changes to Verified and the amount counts toward your monthly pledge.',
  },
  {
    q: 'My account says "Pending approval" — what do I do?',
    a: 'After registering, an admin needs to approve your account before you can submit payments or vote. This usually happens within a day. You can speed it up by using "Contact Admin" below.',
  },
  {
    q: 'How does the Emergency Vote work?',
    a: 'Any approved member can submit a request (Cases tab). All other members vote yes/no. When 50%+ of eligible members vote yes (or no), the case is auto-resolved. Admins can also force-approve, force-reject, or delete requests when needed.',
  },
  {
    q: 'What is Sadaqah / Zakat / Qarz?',
    a: 'Sadaqah is voluntary charity (anonymized). Zakat is the obligatory 2.5% (also anonymized). Qarz is interest-free loans that the community can lend and receive — repayments are tracked openly.',
  },
  {
    q: 'How is my privacy protected?',
    a: 'Sadaqah and Zakat donations are anonymized in the community feed — only the admin sees the donor. Qarz loans and emergency cases ARE public so the community can verify and help. Set screenshot protection in Profile → Security if you want extra privacy.',
  },
  {
    q: 'I changed my password — what happens to my other devices?',
    a: 'By default, changing your password signs out all your other devices. This is a security best practice — anyone who knew the old password loses access. You can disable this in the Change Password screen if needed.',
  },
  {
    q: 'How is the Qibla direction calculated?',
    a: 'Your phone\'s GPS gives your location, and we compute the bearing to the Kaaba in Makkah (21.4225° N, 39.8262° E). The compass needle uses your phone\'s magnetometer to point at Qibla as you rotate the phone. Calibrate by moving the phone in a figure-8 if it seems off.',
  },
];

function FaqRow({ item, expanded, onToggle }: { item: FaqItem; expanded: boolean; onToggle: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.faqRow, { borderBottomColor: colors.border1 }]}>
      <TouchableOpacity onPress={onToggle} style={styles.faqQuestion}>
        <Text style={[styles.qText, { color: colors.text1 }]}>{item.q}</Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.text3}
        />
      </TouchableOpacity>
      {expanded ? (
        <Text style={[styles.aText, { color: colors.text2 }]}>{item.a}</Text>
      ) : null}
    </View>
  );
}

export default function HelpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIdx(openIdx === i ? null : i);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text1} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>Help & FAQ</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.intro, { backgroundColor: colors.glass1, borderColor: colors.border1 }]}>
          <MaterialCommunityIcons name="information-outline" size={20} color={colors.gold} />
          <Text style={[styles.introText, { color: colors.text2 }]}>
            Common questions about Barakah Hub. Still stuck? Tap Contact Admin below.
          </Text>
        </View>

        {FAQ.map((item, i) => (
          <FaqRow key={item.q} item={item} expanded={openIdx === i} onToggle={() => toggle(i)} />
        ))}

        <TouchableOpacity
          onPress={() => router.push('/settings/contact-admin')}
          style={[styles.contactBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}
        >
          <MaterialCommunityIcons name="message-text-outline" size={18} color={colors.primary} />
          <Text style={[styles.contactBtnText, { color: colors.primary }]}>Contact Admin</Text>
        </TouchableOpacity>
      </ScrollView>
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
  headerBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  intro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  introText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  faqRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qText: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  aText: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  contactBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
