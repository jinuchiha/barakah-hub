import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FaqItem { q: string; a: string }

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
  const { t } = useTranslation();
  const FAQ = t('help.faq', { returnObjects: true }) as FaqItem[];
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
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>{t('help.title')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.intro, { backgroundColor: colors.glass1, borderColor: colors.border1 }]}>
          <MaterialCommunityIcons name="information-outline" size={20} color={colors.gold} />
          <Text style={[styles.introText, { color: colors.text2 }]}>{t('help.intro')}</Text>
        </View>

        {FAQ.map((item, i) => (
          <FaqRow key={item.q} item={item} expanded={openIdx === i} onToggle={() => toggle(i)} />
        ))}

        <TouchableOpacity
          onPress={() => router.push('/about' as never)}
          style={[styles.aboutBtn, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}
        >
          <MaterialCommunityIcons name="book-open-outline" size={18} color={colors.gold} />
          <Text style={[styles.aboutBtnText, { color: colors.gold }]}>{t('help.aboutFund')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.text4} style={styles.chevron} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/settings/contact-admin')}
          style={[styles.contactBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}
        >
          <MaterialCommunityIcons name="message-text-outline" size={18} color={colors.primary} />
          <Text style={[styles.contactBtnText, { color: colors.primary }]}>{t('help.contactAdmin')}</Text>
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
  aboutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  aboutBtnText: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  chevron: { marginLeft: 'auto' },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
    paddingVertical: 12,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  contactBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
