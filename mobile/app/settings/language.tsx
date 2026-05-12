import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import { LANGUAGES, type SupportedLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';

function LanguageCard({
  lang,
  isSelected,
  index,
  onPress,
}: {
  lang: typeof LANGUAGES[0];
  isSelected: boolean;
  index: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const borderColor = isSelected ? colors.primary : colors.border1;
  const bg = isSelected ? colors.primaryDim : colors.glass2;

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 60)}>
      <TouchableOpacity
        style={[styles.langCard, { backgroundColor: bg, borderColor }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.flag}>{lang.flag}</Text>
        <View style={styles.langNames}>
          <Text style={[styles.nativeName, { color: colors.text1, writingDirection: lang.rtl ? 'rtl' : 'ltr' }]}>
            {lang.nativeName}
          </Text>
          <Text style={[styles.englishName, { color: colors.text3 }]}>{lang.englishName}</Text>
        </View>
        {isSelected ? (
          <Animated.View entering={ZoomIn.duration(200)}>
            <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />
          </Animated.View>
        ) : (
          <MaterialCommunityIcons name="circle-outline" size={22} color={colors.text4} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function LanguageScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { language, switchLanguage } = useAuth();
  const [selected, setSelected] = useState<SupportedLanguage>(language as SupportedLanguage ?? 'en');
  const [saving, setSaving] = useState(false);

  const handleSelect = (code: SupportedLanguage) => {
    void Haptics.selectionAsync();
    setSelected(code);
  };

  const handleSave = async () => {
    if (selected === language) { router.back(); return; }
    setSaving(true);
    try {
      await switchLanguage(selected);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Language Updated',
        'Restart the app to fully apply the new language direction.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch {
      Alert.alert('Error', 'Could not save language. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text1} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>Select Language</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: colors.text3 }]}>
          Choose your preferred language. RTL languages will flip the layout automatically.
        </Text>

        {LANGUAGES.map((lang, i) => (
          <LanguageCard
            key={lang.code}
            lang={lang}
            isSelected={selected === lang.code}
            index={i}
            onPress={() => handleSelect(lang.code)}
          />
        ))}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border1, backgroundColor: colors.bg1 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: saving ? colors.primaryDim : colors.primary }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Language'}</Text>
        </TouchableOpacity>
      </View>
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
  scroll: { padding: spacing.md, gap: spacing.sm },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    gap: spacing.md,
  },
  flag: { fontSize: 32 },
  langNames: { flex: 1 },
  nativeName: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  englishName: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  saveBtn: {
    borderRadius: radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#000',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
});
