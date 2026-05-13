import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch,
  // Switch retained for biometric/screenshot/pin toggles below
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AvatarUpload } from '@/components/AvatarUpload';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { useMyPayments } from '@/hooks/usePayments';
import { useMyLoans } from '@/hooks/useLoans';
import { useBiometric } from '@/hooks/useBiometric';
import { useTheme } from '@/lib/useTheme';
import { formatDate } from '@/lib/format';
import { spacing, radius } from '@/lib/theme';
import { isScreenshotProtectionEnabled, setScreenshotProtection } from '@/lib/security';
import { isPinEnabled } from '@/lib/pin';
import { getCacheSize } from '@/lib/query-persist';

interface SettingsRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  rightNode?: React.ReactNode;
  danger?: boolean;
}

function SettingsRow({ icon, label, value, onPress, chevron = true, rightNode, danger = false }: SettingsRowProps) {
  const { colors } = useTheme();
  const iconColor = danger ? colors.danger : colors.primary;

  return (
    <TouchableOpacity
      style={[styles.settingsRow, { borderBottomColor: colors.border1 }]}
      onPress={onPress}
      disabled={!onPress && !rightNode}
      activeOpacity={0.7}
    >
      <View style={styles.settingsLeft}>
        <View style={[styles.settingsIconCircle, { backgroundColor: `${iconColor}18` }]}>
          <MaterialCommunityIcons name={icon as never} size={16} color={iconColor} />
        </View>
        <Text style={[styles.settingsLabel, { color: danger ? colors.danger : colors.text1 }]}>{label}</Text>
      </View>
      <View style={styles.settingsRight}>
        {value ? <Text style={[styles.settingsValue, { color: colors.text4 }]}>{value}</Text> : null}
        {rightNode ?? null}
        {chevron && onPress && !rightNode ? (
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.text4} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.settingsGroup}>
      <Text style={[styles.groupTitle, { color: colors.text4 }]}>{title}</Text>
      <GlassCard style={styles.groupCard}>
        {children}
      </GlassCard>
    </View>
  );
}

function ProfileScreen() {
  const router = useRouter();
  const { user, logout, language, switchLanguage } = useAuth();
  const { colors } = useTheme();
  const { data: payments } = useMyPayments();
  const { data: loans } = useMyLoans();
  const { enabled: biometricEnabled, label: biometricLabel, enable: enableBiometric, disable: disableBiometric } = useBiometric();
  const [loggingOut, setLoggingOut] = useState(false);
  const [screenshotProtected, setScreenshotProtected] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);

  useEffect(() => {
    void isScreenshotProtectionEnabled().then(setScreenshotProtected);
    void isPinEnabled().then(setPinEnabled);
    setCacheSize(getCacheSize());
  }, []);

  const totalDonated = payments?.filter((p) => !p.pendingVerify && p.verifiedAt).reduce((s, p) => s + p.amount, 0) ?? 0;
  const activeLoans = loans?.filter((l) => l.active).length ?? 0;
  const casesVoted = 0;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try { await logout(); } finally { setLoggingOut(false); }
        },
      },
    ]);
  };

  const handleScreenshotToggle = async (val: boolean) => {
    await setScreenshotProtection(val);
    setScreenshotProtected(val);
  };

  const handleBiometricToggle = async (val: boolean) => {
    if (val) {
      await enableBiometric();
    } else {
      await disableBiometric();
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.profileHeader}>
          <AvatarUpload
            name={user.nameEn || user.nameUr}
            color={user.color}
            currentUrl={user.photoUrl}
          />
          <Text style={[styles.profileName, { color: colors.text1 }]}>{user.nameEn}</Text>
          {user.nameUr ? <Text style={[styles.profileNameUr, { color: colors.text3 }]}>{user.nameUr}</Text> : null}
          <View style={styles.badgeRow}>
            <Badge label={user.role === 'admin' ? 'Admin' : 'Member'} variant={user.role === 'admin' ? 'info' : 'success'} />
          </View>
          <Text style={[styles.joinDate, { color: colors.text4 }]}>
            Member since {formatDate(user.joinedAt)} · #{user.id.slice(0, 8).toUpperCase()}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.statsRow}>
          <StatCard icon="cash-check" value={`PKR ${(totalDonated / 1000).toFixed(0)}K`} label="Total Donated" style={styles.stat} />
          <StatCard icon="vote" value={`${casesVoted}`} label="Cases Voted" iconColor={colors.gold} style={styles.stat} />
          <StatCard icon="handshake-outline" value={`${activeLoans}`} label="Active Loans" iconColor={colors.accent} style={styles.stat} />
        </Animated.View>

        <SettingsGroup title="ACCOUNT">
          <SettingsRow icon="account-edit-outline" label="Edit Profile" onPress={() => router.push('/settings/edit-profile')} />
          <SettingsRow icon="lock-reset" label="Change Password" onPress={() => router.push('/settings/change-password')} />
          <SettingsRow icon="family-tree" label="Family Tree" onPress={() => router.push('/family-tree')} />
          <SettingsRow icon="trophy-outline" label="Achievements" onPress={() => router.push('/achievements')} />
          <SettingsRow icon="qrcode-scan" label="My QR Code" onPress={() => router.push('/qr-pay')} />
          <SettingsRow icon="tools" label="Islamic Tools" onPress={() => router.push('/tools')} />
          <SettingsRow icon="robot-outline" label="AI Assistant" onPress={() => router.push('/ai-assistant')} />
        </SettingsGroup>

        <SettingsGroup title="PREFERENCES">
          <SettingsRow
            icon="translate"
            label="Language"
            value={language?.toUpperCase() ?? 'EN'}
            onPress={() => router.push('/settings/language')}
          />
          <SettingsRow
            icon="palette-outline"
            label="Appearance"
            onPress={() => router.push('/settings/theme')}
          />
          <SettingsRow icon="bell-outline" label="Notifications" onPress={() => router.push('/notifications')} />
          <SettingsRow icon="alarm" label="Reminders" onPress={() => router.push('/settings/reminders')} />
        </SettingsGroup>

        <SettingsGroup title="SECURITY">
          <SettingsRow
            icon="fingerprint"
            label={`${biometricLabel} Lock`}
            rightNode={
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: colors.bg4, true: colors.primaryDim }}
                thumbColor={colors.primary}
              />
            }
            chevron={false}
          />
          <SettingsRow
            icon="dialpad"
            label="PIN Lock"
            value={pinEnabled ? 'Enabled' : 'Disabled'}
            onPress={() => router.push('/(auth)/pin-setup')}
          />
          <SettingsRow
            icon="camera-off"
            label="Screenshot Protection"
            rightNode={
              <Switch
                value={screenshotProtected}
                onValueChange={handleScreenshotToggle}
                trackColor={{ false: colors.bg4, true: colors.primaryDim }}
                thumbColor={colors.primary}
              />
            }
            chevron={false}
          />
          <SettingsRow
            icon="database-outline"
            label="Offline Cache"
            value={`${(cacheSize / 1024).toFixed(0)} KB`}
            chevron={false}
          />
        </SettingsGroup>

        {user.role === 'admin' ? (
          <SettingsGroup title="ADMIN">
            <SettingsRow icon="shield-crown-outline" label="Admin Panel" onPress={() => router.push('/admin/')} />
            <SettingsRow icon="account-group-outline" label="Members Directory" onPress={() => router.push('/members/')} />
          </SettingsGroup>
        ) : null}

        <SettingsGroup title="SUPPORT">
          <SettingsRow icon="help-circle-outline" label="Help & FAQ" onPress={() => {}} />
          <SettingsRow icon="message-outline" label="Contact Admin" onPress={() => {}} />
        </SettingsGroup>

        <View style={styles.dangerZone}>
          <Button
            label={loggingOut ? 'Signing out...' : 'Sign Out'}
            onPress={handleLogout}
            variant="danger"
            fullWidth
            loading={loggingOut}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default ProfileScreen;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 120 },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  profileName: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginTop: spacing.md,
  },
  profileNameUr: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  joinDate: {
    fontSize: 12,
    fontFamily: 'SpaceMono_400Regular',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stat: { flex: 1 },
  settingsGroup: {
    marginBottom: spacing.md,
  },
  groupTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  groupCard: {
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  settingsIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  settingsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingsValue: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  langSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  dangerZone: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});
