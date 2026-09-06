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
}

// Order follows how often a member actually reaches for each surface.
// Payments sits second because it is the most-used one — not because it is
// decorated. It used to be a raised, glowing gold circle in the middle, which
// made the navigation bar read as a promotional CTA and gave the app two
// competing primary actions on the Payments screen itself. Discoverability
// now comes from position and a calm selected state; the primary action lives
// inside Payments, where the user is already looking for it.
// Non-admins therefore see exactly five tabs.
const TABS: TabDef[] = [
  { name: 'index', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard', labelKey: 'nav.dashboard' },
  { name: 'payments', icon: 'cash-multiple', activeIcon: 'cash-multiple', labelKey: 'nav.payments' },
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
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.7, 1]) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.1]) }],
  }));

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // Active icon floats up ~2px with a spring — the whole bar feels alive
  // without anything protruding out of it.
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [0, -3]) }],
  }));

  const handlePress = () => {
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
    // v2 — a floating dock, not a full-width bar. Detached from the screen
    // edges with real elevation, a lit gradient face and a top sheen, it
    // reads as a physical object on every platform; iOS additionally gets
    // blur behind the gradient. The outer container stays overflow-visible
    // so the raised gold center button can float above the dock.
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={[styles.dock, { borderColor: colors.border1, shadowColor: '#000' }]}>
        <View style={styles.chrome} pointerEvents="none">
          {Platform.OS === 'ios' ? (
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFillObject} />
          ) : null}
          <LinearGradient
            colors={[`${colors.bg3}FA`, `${colors.bg1}FA`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={[`${colors.primary}14`, 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.7 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.dockSheen, { backgroundColor: colors.sheen }]} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 12 },
  dock: {
    borderRadius: 28,
    borderWidth: 1,
    // Depth: dual-platform. elevation carries Android; shadow* carries iOS.
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  chrome: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: 27 },
  dockSheen: { position: 'absolute', top: 0, left: 22, right: 22, height: StyleSheet.hairlineWidth * 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 6 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 5, paddingHorizontal: 2 },
  iconArea: { alignItems: 'center', justifyContent: 'center', width: 46, height: 32, marginBottom: 3 },
  activePill: { ...StyleSheet.absoluteFillObject, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  iconWrap: { position: 'relative' },
  badge: { position: 'absolute', top: -5, right: -7, borderRadius: 8, minWidth: 15, height: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 8, fontFamily: 'Inter_700Bold' },
  tabLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: -0.1, textAlign: 'center' },
});
