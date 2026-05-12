import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/useTheme';
import { radius, spacing } from '@/lib/theme';

export type TabRoute = 'index' | 'payments' | 'cases' | 'loans' | 'analytics' | 'profile';

interface TabDef {
  name: TabRoute;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  adminOnly?: boolean;
}

const TABS: TabDef[] = [
  { name: 'index', icon: 'view-dashboard-outline', label: 'Home' },
  { name: 'payments', icon: 'cash-multiple', label: 'Payments' },
  { name: 'cases', icon: 'alert-circle-outline', label: 'Cases' },
  { name: 'loans', icon: 'handshake-outline', label: 'Loans' },
  { name: 'analytics', icon: 'chart-line', label: 'Analytics', adminOnly: true },
  { name: 'profile', icon: 'account-circle-outline', label: 'Profile' },
];

interface TabItemProps {
  tab: TabDef;
  active: boolean;
  badge?: number;
  onPress: () => void;
}

function TabItem({ tab, active, badge, onPress }: TabItemProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.88, { damping: 12, stiffness: 500 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 12, stiffness: 500 });
    }, 100);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable style={styles.tabItem} onPress={handlePress}>
      <Animated.View style={animStyle}>
        <View style={[styles.tabInner, active && { backgroundColor: colors.primaryDim }]}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons
              name={active ? (tab.icon.replace('-outline', '') as keyof typeof MaterialCommunityIcons.glyphMap) : tab.icon}
              size={22}
              color={active ? colors.primary : colors.text3}
            />
            {badge && badge > 0 ? (
              <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
              </View>
            ) : null}
          </View>
          {active ? (
            <Text style={[styles.tabLabel, { color: colors.primary }]}>{tab.label}</Text>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

interface BottomNavProps {
  activeTab: TabRoute;
  onTabPress: (tab: TabRoute) => void;
  notificationCount?: number;
  isAdmin?: boolean;
}

export function BottomNav({ activeTab, onTabPress, notificationCount = 0, isAdmin = false }: BottomNavProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.bg2 }]} />
      )}
      <View style={[styles.border, { backgroundColor: colors.glassBorder }]} />
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
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  border: {
    height: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    gap: 6,
  },
  iconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
});
