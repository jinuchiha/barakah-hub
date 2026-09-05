import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/useTheme';

export type TabRoute = 'index' | 'payments' | 'cases' | 'loans' | 'analytics' | 'profile';

interface TabDef {
  name: TabRoute;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  activeIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  labelKey: string;
  adminOnly?: boolean;
  center?: boolean;
}

const TABS: TabDef[] = [
  { name: 'index', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard', labelKey: 'nav.dashboard' },
  { name: 'cases', icon: 'alert-circle-outline', activeIcon: 'alert-circle', labelKey: 'nav.cases' },
  // The most important action lives in the middle, raised and gold.
  { name: 'payments', icon: 'cash-plus', labelKey: 'nav.payments', center: true },
  { name: 'loans', icon: 'handshake-outline', activeIcon: 'handshake', labelKey: 'nav.loans' },
  { name: 'analytics', icon: 'chart-line', labelKey: 'nav.analytics', adminOnly: true },
  { name: 'profile', icon: 'account-circle-outline', activeIcon: 'account-circle', labelKey: 'nav.profile' },
];

interface TabItemProps {
  tab: TabDef;
  active: boolean;
  badge?: number;
  onPress: () => void;
}

function TabItem({ tab, active, badge, onPress }: TabItemProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const progress = useSharedValue(active ? 1 : 0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, { damping: 18, stiffness: 200 });
  }, [active, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.7, 1]) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.1]) }],
  }));

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // Active icon floats up ~2px with a spring — the whole bar feels alive
  // without anything protruding out of it.
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [0, -2.5]) }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.2 + progress.value * 0.35,
  }));

  const handlePress = () => {
    scale.value = withSpring(0.85, { damping: 10, stiffness: 500 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 400 });
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const iconName = (active ? (tab.activeIcon ?? tab.icon) : tab.icon) as keyof typeof MaterialCommunityIcons.glyphMap;

  if (tab.center) {
    return (
      <Pressable
        style={styles.tabItem}
        onPress={handlePress}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={t(tab.labelKey)}
      >
        <Animated.View style={[styles.iconArea, scaleStyle, floatStyle]}>
          <Animated.View style={[styles.centerBtn, glowStyle]}>
            <LinearGradient
              colors={active ? ['#e8c563', '#b8893a'] : ['#d9b04c', '#a87d33']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <MaterialCommunityIcons name={iconName} size={20} color="#0a0f1a" />
          </Animated.View>
        </Animated.View>
        <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.text4 }]} numberOfLines={1}>
          {t(tab.labelKey)}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={styles.tabItem}
      onPress={handlePress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={t(tab.labelKey)}
    >
      {/* Icon area with animated pill indicator */}
      <Animated.View style={[styles.iconArea, scaleStyle, floatStyle]}>
        <Animated.View style={[styles.activePill, pillStyle]}>
          <LinearGradient
            colors={[`${colors.primary}22`, `${colors.primary}10`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
        <Animated.View style={[styles.iconWrap, iconStyle]}>
          <MaterialCommunityIcons
            name={iconName}
            size={21}
            color={active ? colors.primary : colors.text3}
          />
          {badge && badge > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.danger }]}>
              <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>

      {/* Label below icon — always rendered, bounded by tab width */}
      <Text
        style={[styles.tabLabel, { color: active ? colors.primary : colors.text4 }]}
        numberOfLines={1}
      >
        {t(tab.labelKey)}
      </Text>
    </Pressable>
  );
}

export function BottomNav({ activeTab, onTabPress, notificationCount = 0, isAdmin = false }: {
  activeTab: TabRoute;
  onTabPress: (tab: TabRoute) => void;
  notificationCount?: number;
  isAdmin?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    // Outer container stays overflow-visible so the raised center button
    // (and its gold glow) can float above the bar; the blur/gradient
    // chrome is clipped inside its own absolute layer instead.
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      <View style={styles.chrome} pointerEvents="none">
        {Platform.OS === 'ios' ? (
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject} />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: `${colors.bg2}F5` }]} />
        )}
        <View style={[styles.topBorder, { backgroundColor: colors.glassBorder }]} />
        <LinearGradient
          colors={['rgba(200,155,60,0.06)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View style={styles.row}>
        {visibleTabs.map((tab) => (
          <TabItem
            key={tab.name}
            tab={tab}
            active={activeTab === tab.name}
            badge={tab.name === 'profile' ? notificationCount : undefined}
            onPress={() => onTabPress(tab.name)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  chrome: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  topBorder: { height: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingTop: 8 },
  centerBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowColor: '#d9b04c', shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 5, paddingHorizontal: 2 },
  iconArea: { alignItems: 'center', justifyContent: 'center', width: 46, height: 32, marginBottom: 3 },
  activePill: { ...StyleSheet.absoluteFillObject, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(200,155,60,0.15)' },
  iconWrap: { position: 'relative' },
  badge: { position: 'absolute', top: -5, right: -7, borderRadius: 8, minWidth: 15, height: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 8, fontFamily: 'Inter_700Bold' },
  tabLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: -0.1, textAlign: 'center' },
});
