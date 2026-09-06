import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/GlassCard';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

interface ScriptureRef {
  arabic: string;
  english: string;
  urdu: string;
  ref: string;
  topic: 'Sadaqah' | 'Zakat' | 'Qarz-e-Hasana';
}

const REFS: ScriptureRef[] = [
  {
    arabic: 'مَّثَلُ ٱلَّذِينَ يُنفِقُونَ أَمْوَٰلَهُمْ فِى سَبِيلِ ٱللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ فِى كُلِّ سُنۢبُلَةٍ مِّا۟ئَةُ حَبَّةٍ…',
    english: 'The example of those who spend in the way of Allah is like a seed that grows seven ears; in every ear a hundred grains…',
    urdu: 'جو لوگ اللہ کی راہ میں اپنا مال خرچ کرتے ہیں ان کی مثال اس دانے کی سی ہے جس سے سات بالیاں اگیں، ہر بالی میں سو دانے…',
    ref: 'Al-Baqarah 2:261',
    topic: 'Sadaqah',
  },
  {
    arabic: 'وَمَا أَنفَقْتُم مِّن شَىْءٍ فَهُوَ يُخْلِفُهُۥ ۖ وَهُوَ خَيْرُ ٱلرَّٰزِقِينَ',
    english: 'Whatever you spend, He will replace it, and He is the best of providers.',
    urdu: 'اور جو کچھ تم خرچ کرتے ہو اللہ اس کا بدلہ دیتا ہے اور وہ بہترین رزق دینے والا ہے۔',
    ref: 'Saba 34:39',
    topic: 'Sadaqah',
  },
  {
    arabic: 'وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ وَأَطِيعُوا الرَّسُولَ لَعَلَّكُمْ تُرْحَمُونَ',
    english: 'Establish prayer and give zakah and obey the Messenger that you may receive mercy.',
    urdu: 'نماز قائم کرو، زکوٰة دو، اور رسول کی اطاعت کرو تاکہ تم پر رحم کیا جائے۔',
    ref: 'An-Nur 24:56',
    topic: 'Zakat',
  },
  {
    arabic: 'مَن ذَا ٱلَّذِى يُقْرِضُ ٱللَّهَ قَرْضًا حَسَنًا فَيُضَٰعِفَهُۥ لَهُۥٓ أَضْعَافًا كَثِيرَةً…',
    english: 'Who is it that would loan Allah a goodly loan so He may multiply it for him many times over?',
    urdu: 'کون ہے جو اللہ کو قرض حسنہ دے تاکہ اللہ اسے کئی گنا بڑھا کر لوٹائے؟',
    ref: 'Al-Baqarah 2:245',
    topic: 'Qarz-e-Hasana',
  },
  {
    arabic: 'وَإِن كَانَ ذُو عُسْرَةٍ فَنَظِرَةٌ إِلَىٰ مَيْسَرَةٍ ۚ وَأَن تَصَدَّقُوا۟ خَيْرٌ لَّكُمْ ۖ إِن كُنتُمْ تَعْلَمُونَ',
    english: 'If the debtor is in hardship, let there be postponement until ease. And if you remit it as charity, it is better for you — if you only knew.',
    urdu: 'اگر قرض لینے والا تنگدست ہو تو اسے آسانی تک مہلت دو، اور معاف کر دو تو تمہارے لیے بہتر ہے، اگر تم جانو۔',
    ref: 'Al-Baqarah 2:280',
    topic: 'Qarz-e-Hasana',
  },
];

const HOW_IT_WORKS_KEYS = [
  { title: 'Sadaqah', descKey: 'about.features.sadaqah' },
  { title: 'Zakat', descKey: 'about.features.zakat' },
  { title: 'Qarz-e-Hasana', descKey: 'about.features.qarz' },
  { title: 'Emergency Vote', descKey: 'about.features.emergencyVote' },
  { title: 'Privacy', descKey: 'about.features.privacy' },
  { title: 'Audit Trail', descKey: 'about.features.auditTrail' },
];

type TopicKey = ScriptureRef['topic'];

const TOPIC_COLORS: Record<TopicKey, { text: string; bg: string; border: string }> = {
  'Sadaqah': { text: '#4ec38d', bg: 'rgba(45,138,95,0.15)', border: 'rgba(45,138,95,0.3)' },
  'Zakat': { text: '#e8c563', bg: 'rgba(200,155,60,0.15)', border: 'rgba(200,155,60,0.3)' },
  'Qarz-e-Hasana': { text: '#92b3df', bg: 'rgba(96,141,215,0.15)', border: 'rgba(96,141,215,0.3)' },
};

function TopicBadge({ topic }: { topic: TopicKey }) {
  const c = TOPIC_COLORS[topic];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{topic}</Text>
    </View>
  );
}

function ScriptureCard({ item }: { item: ScriptureRef }) {
  const { colors } = useTheme();
  return (
    <GlassCard elevated style={styles.scriptureCard}>
      <View style={styles.scriptureTop}>
        <TopicBadge topic={item.topic} />
        <Text style={[styles.refText, { color: colors.text4 }]}>{item.ref}</Text>
      </View>
      {/* The data carries its own ellipsis where a quotation is partial —
          never append one blindly to complete quotes. */}
      <Text style={[styles.arabic, { color: colors.gold }]} accessibilityLanguage="ar">{item.arabic}</Text>
      <Text style={[styles.english, { color: colors.text3 }]}>"{item.english}"</Text>
      <Text style={[styles.urdu, { color: colors.text4 }]}>{item.urdu}</Text>
    </GlassCard>
  );
}

function HowRow({ title, desc }: { title: string; desc: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.howRow, { borderColor: colors.border1, backgroundColor: colors.glass1 }]}>
      <View style={[styles.howAccent, { backgroundColor: colors.gold }]} />
      <View style={styles.howText}>
        <Text style={[styles.howTitle, { color: colors.text1 }]}>{title}</Text>
        <Text style={[styles.howDesc, { color: colors.text3 }]}>{desc}</Text>
      </View>
    </View>
  );
}

export default function AboutScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'About This Fund', headerShown: true }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Intro card */}
        <GlassCard style={styles.introCard}>
          <Text style={[styles.introTitle, { color: colors.gold }]} accessibilityLanguage="ar">اس فنڈ کے بارے میں</Text>
          <Text style={[styles.introSubtitle, { color: colors.text4 }]}>Islamic basis of this family fund</Text>
          <Text style={[styles.introBody, { color: colors.text2 }]}>
            Barakah aik private, invite-only family fund hai jis mein sadaqah (donation), zakat,
            aur qarz-e-hasana (interest-free loan) Islam ke usoolon ke mutabiq manage kiye jaate hain.
            Har contribution mein donor ka naam sirf admin dekh sakta hai · sadqa ki roohaniyat ke mutabiq.
          </Text>
        </GlassCard>

        {/* Scripture references */}
        <Text style={[styles.section, { color: colors.text4 }]}>{t('about.scriptureSection')}</Text>
        {REFS.map((r) => <ScriptureCard key={r.ref} item={r} />)}

        {/* How it works */}
        <Text style={[styles.section, { color: colors.text4 }]}>{t('about.howSection')}</Text>
        <GlassCard style={styles.howCard}>
          {HOW_IT_WORKS_KEYS.map((h) => <HowRow key={h.title} title={h.title} desc={t(h.descKey)} />)}
        </GlassCard>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 60 },
  section: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  introCard: { padding: spacing.lg, marginBottom: spacing.sm },
  introTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  introSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic', marginBottom: spacing.md },
  introBody: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 21 },
  scriptureCard: { padding: spacing.md, marginBottom: spacing.sm },
  scriptureTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
  badgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  refText: { fontSize: 10, fontFamily: 'SpaceMono_400Regular' },
  arabic: {
    fontFamily: 'NotoNaskhArabic_400Regular',
    fontSize: 16,
    lineHeight: 28,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: spacing.sm,
    fontWeight: '400',
  },
  english: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic', lineHeight: 18, marginBottom: 6 },
  urdu: { fontSize: 11, fontFamily: 'NotoNastaliqUrdu_400Regular', textAlign: 'right', lineHeight: 30 },
  howCard: { padding: spacing.md },
  howRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  howAccent: { width: 3, borderRadius: 2, minHeight: 40 },
  howText: { flex: 1 },
  howTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 3 },
  howDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
});
