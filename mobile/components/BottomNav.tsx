import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/useTheme';
import { radius } from '@/lib/theme';

export type TabRoute = 'index' | 'payments' | 'cases' | 'loans' | 'analytics' | 'profile';

interface TabDef {
  name: TabRoute;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  activeIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  labelKey: string;
  adminOnly?: boolean;
}

const TABS: TabDef[] = [
  { name: 'index', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard', labelKey: 'nav.dashboard' },
  { name: 'payments', icon: 'cash-multiple', labelKey: 'nav.payments' },
  { name: 'cases', icon: 'alert-circle-outline', activeIcon: 'alert-circle', labelKey: 'nav.cases' },
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
    transform: [{ scaleX: interpolate(progress.value, [0, 1], [0.7, 1]) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.08]) }],
  }));

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSpring(0.85, { damping: 10, stiffness: 500 });
    // Use Reanimated callback instead of setTimeout to avoid memory leak on unmount
    scale.value = withSpring(0.85, { damping: 10, stiffness: 500 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 400 });
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const iconName = (active ? (tab.activeIcon ?? tab.icon) : tab.icon) as keyof typeof MaterialCommunityIcons.glyphMap;

  return (
    <Pressable
      style={styles.tabItem}
      onPress={handlePress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={t(tab.labelKey)}
    >
      <Animated.View style={[styles.tabContent, scaleStyle]}>
        {/* Animated pill background */}
        <Animated.View style={[styles.activePill, pillStyle]}>
          <LinearGradient
            colors={[`${colors.primary}22`, `${colors.primary}10`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        {/* Icon */}
        <Animated.View style={[styles.iconWrap, iconStyle]}>
          <MaterialCommunityIcons
            name={iconName}
            size={active ? 22 : 21}
            color={active ? colors.primary : colors.text3}
          />
          {badge && badge > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.danger }]}>
              <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* Label — slides in when active */}
        {active ? (
          <Animated.Text style={[styles.tabLabel, { color: colors.primary }, pillStyle]} numberOfLines={1}>
            {t(tab.labelKey)}
          </Animated.Text>
        ) : null}
      </Animated.View>
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
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: `${colors.bg2}F5` }]} />
      )}
      {/* Top border with gold tint */}
      <View style={[styles.topBorder, { backgroundColor: colors.glassBorder }]} />
      <LinearGradient
        colors={['rgba(200,155,60,0.06)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFillObject]}
        pointerEvents="none"
      />
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
  container: { position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' },
  topBorder: { height: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, gap: 5, minHeight: 38 },
  activePill: { ...StyleSheet.absoluteFillObject, borderRadius: radius.full, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(200,155,60,0.12)' },
  iconWrap: { position: 'relative' },
  badge: { position: 'absolute', top: -5, right: -7, borderRadius: 8, minWidth: 15, height: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 8, fontFamily: 'Inter_700Bold' },
  tabLabel: { fontSize: 11.5, fontFamily: 'Inter_600SemiBold', letterSpacing: -0.2 },
});
