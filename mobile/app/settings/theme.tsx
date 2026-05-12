import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius, type ThemeName } from '@/lib/theme';

interface ThemePreview {
  name: ThemeName;
  label: string;
  description: string;
  swatches: string[];
  icon: string;
}

const THEME_PREVIEWS: ThemePreview[] = [
  {
    name: 'dark',
    label: 'Dark',
    description: 'Classic dark glassmorphic',
    swatches: ['#111118', '#1a1a24', '#00e676', '#ffd740'],
    icon: 'weather-night',
  },
  {
    name: 'light',
    label: 'Light',
    description: 'Clean light mode',
    swatches: ['#f8fafc', '#ffffff', '#1a7a4a', '#f59e0b'],
    icon: 'weather-sunny',
  },
  {
    name: 'amoled',
    label: 'AMOLED',
    description: 'True black — saves battery',
    swatches: ['#000000', '#0a0a0a', '#00e676', '#ffd740'],
    icon: 'cellphone',
  },
  {
    name: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'Neon purple + cyan',
    swatches: ['#130020', '#1a0030', '#00ffcc', '#ff00ff'],
    icon: 'lightning-bolt',
  },
  {
    name: 'desert',
    label: 'Desert',
    description: 'Warm sandy luxury',
    swatches: ['#221a0c', '#2d2210', '#2ed573', '#f5c842'],
    icon: 'weather-sunny-alert',
  },
];

function ThemeCard({
  preview,
  isActive,
  index,
  onPress,
}: {
  preview: ThemePreview;
  isActive: boolean;
  index: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 70)}>
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.glass2,
            borderColor: isActive ? colors.primary : colors.border1,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}20` }]}>
            <MaterialCommunityIcons name={preview.icon as never} size={22} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.themeName, { color: colors.text1 }]}>{preview.label}</Text>
            <Text style={[styles.themeDesc, { color: colors.text3 }]}>{preview.description}</Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={styles.swatches}>
            {preview.swatches.map((color, i) => (
              <View key={i} style={[styles.swatch, { backgroundColor: color }]} />
            ))}
          </View>
          {isActive ? (
            <Animated.View entering={ZoomIn.duration(200)}>
              <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
            </Animated.View>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ThemeScreen() {
  const router = useRouter();
  const { colors, themeName, setTheme } = useTheme();

  const handleSelect = async (name: ThemeName) => {
    void Haptics.selectionAsync();
    await setTheme(name);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text1} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>Appearance</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: colors.text3 }]}>
          Choose a theme. Changes apply instantly.
        </Text>
        {THEME_PREVIEWS.map((preview, i) => (
          <ThemeCard
            key={preview.name}
            preview={preview}
            isActive={themeName === preview.name}
            index={i}
            onPress={() => handleSelect(preview.name)}
          />
        ))}
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
  backBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  scroll: { padding: spacing.md, gap: spacing.sm },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1.5,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  themeDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatches: { flexDirection: 'row', gap: 4 },
  swatch: { width: 16, height: 16, borderRadius: 8 },
});
