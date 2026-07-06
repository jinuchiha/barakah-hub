import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch,
  // Switch retained for biometric/screenshot/pin toggles below
} from 'react-native';
import { useTranslation } from 'react-i18next';
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
import { useAuthStore } from '@/stores/auth.store';
import { updateProfile } from '@/lib/auth';
import { useMyPayments } from '@/hooks/usePayments';
import { useMyLoans } from '@/hooks/useLoans';
import { useBiometric } from '@/hooks/useBiometric';
import { useTheme } from '@/lib/useTheme';
import { formatDate, formatPKR } from '@/lib/format';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { canManageFunds, isAdminOnly, roleLabel } from '@/lib/roles';
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
      accessibilityRole="button"
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
  const setUser = useAuthStore((s) => s.setUser);
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data: payments } = useMyPayments();
  const { data: loans } = useMyLoans();
  const { enabled: biometricEnabled, label: biometricLabel, enable: enableBiometric, disable: disableBiometric } = useBiometric();
  const [loggingOut, setLoggingOut] = useState(false);
  const [screenshotProtected, setScreenshotProtected] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);

  useEffect(() => {
    isScreenshotProtectionEnabled().then(setScreenshotProtected).catch(() => {});
    isPinEnabled().then(setPinEnabled).catch(() => {});
    setCacheSize(getCacheSize());
  }, []);

  const totalDonated = payments?.filter((p) => !p.pendingVerify && p.verifiedAt).reduce((s, p) => s + p.amount, 0) ?? 0;
  const activeLoans = loans?.filter((l) => l.active).length ?? 0;

  const handleLogout = () => {
    Alert.alert(t('profile.signOut'), t('profile.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.signOut'),
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try { await logout(); } finally { setLoggingOut(false); }
        },
      },
    ]);
  };

  const handleScreenshotToggle = async (val: boolean) => {
    try {
      await setScreenshotProtection(val);
      setScreenshotProtected(val);
    } catch {
      Alert.alert(t('common.error'), t('profile.screenshotError'));
    }
  };

  const handleBiometricToggle = async (val: boolean) => {
    try {
      if (val) await enableBiometric();
      else await disableBiometric();
    } catch {
      Alert.alert(t('common.error'), t('profile.biometricError'));
    }
  };

  const handleAvatarUploaded = async (url: string) => {
    if (!user) return;
    const previous = user;
    setUser({ ...previous, photoUrl: url });
    try {
      await updateProfile({ photoUrl: url });
    } catch {
      setUser(previous);
      Alert.alert(t('common.error'), t('editProfile.failedToSave'));
    }
  };

  if (!user) return <LoadingScreen />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.profileHeader}>
          <AvatarUpload
            name={user.nameEn || user.nameUr}
            color={user.color}
            currentUrl={user.photoUrl}
            onUploadComplete={handleAvatarUploaded}
          />
          <Text style={[styles.profileName, { color: colors.text1 }]}>{user.nameEn}</Text>
          {user.nameUr ? <Text style={[styles.profileNameUr, { color: colors.text3 }]}>{user.nameUr}</Text> : null}
          <View style={styles.badgeRow}>
            <Badge label={roleLabel(user.role)} variant={canManageFunds(user.role) ? 'info' : 'success'} />
          </View>
          <Text style={[styles.joinDate, { color: colors.text4 }]}>
            {t('profile.memberSince')} {user.joinedAt ? formatDate(user.joinedAt) : ''} · #{user.id.slice(0, 8).toUpperCase()}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.statsOuter}>
          <View style={styles.statsRow}>
            <StatCard icon="cash-check" value={formatPKR(totalDonated)} label={t('profile.totalDonated')} style={styles.statHalf} />
            <StatCard icon="hand-heart-outline" value={formatPKR(user.monthlyPledge)} label={t('profile.monthlyPledge')} iconColor={colors.gold} style={styles.statHalf} />
          </View>
          <StatCard icon="handshake-outline" value={`${activeLoans}`} label={t('profile.activeLoans')} iconColor={colors.accent} />
        </Animated.View>

        <SettingsGroup title={t('profile.account')}>
          <SettingsRow icon="account-edit-outline" label={t('profile.editProfile')} onPress={() => router.push('/settings/edit-profile')} />
          <SettingsRow icon="lock-reset" label={t('profile.changePassword')} onPress={() => router.push('/settings/change-password')} />
          <SettingsRow icon="family-tree" label={t('profile.familyTree')} onPress={() => router.push('/family-tree')} />
          <SettingsRow icon="trophy-outline" label={t('profile.achievements')} onPress={() => router.push('/achievements')} />
          <SettingsRow icon="qrcode-scan" label={t('profile.myQrCode')} onPress={() => router.push('/qr-pay')} />
          <SettingsRow icon="tools" label={t('profile.islamicTools')} onPress={() => router.push('/tools')} />
          <SettingsRow icon="robot-outline" label={t('profile.aiAssistant')} onPress={() => router.push('/ai-assistant')} />
        </SettingsGroup>

        <SettingsGroup title={t('profile.preferences')}>
          <SettingsRow
            icon="translate"
            label={t('profile.language')}
            value={language?.toUpperCase() ?? 'EN'}
            onPress={() => router.push('/settings/language')}
          />
          <SettingsRow
            icon="palette-outline"
            label={t('profile.appearance')}
            onPress={() => router.push('/settings/theme')}
          />
          <SettingsRow icon="bell-outline" label={t('profile.notifications')} onPress={() => router.push('/notifications')} />
          <SettingsRow icon="message-text-outline" label={t('profile.messages')} onPress={() => router.push('/messages')} />
          <SettingsRow icon="alarm" label={t('profile.reminders')} onPress={() => router.push('/settings/reminders')} />
        </SettingsGroup>

        <SettingsGroup title={t('profile.security')}>
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
            label={t('profile.pinLock')}
            value={pinEnabled ? t('profile.enabled') : t('profile.disabled')}
            onPress={() => router.push('/(auth)/pin-setup')}
          />
          <SettingsRow
            icon="camera-off"
            label={t('profile.screenshotProtection')}
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
            label={t('profile.offlineCache')}
            value={`${(cacheSize / 1024).toFixed(0)} KB`}
            chevron={false}
          />
        </SettingsGroup>

        {canManageFunds(user.role) ? (
          <SettingsGroup title={isAdminOnly(user.role) ? t('profile.adminGroup') : t('profile.supervisorGroup')}>
            <SettingsRow
              icon="shield-crown-outline"
              label={isAdminOnly(user.role) ? t('profile.adminPanel') : t('profile.supervisorPanel')}
              onPress={() => router.push('/admin' as any)}
            />
            {isAdminOnly(user.role) ? (
              <SettingsRow icon="account-group-outline" label={t('profile.membersDirectory')} onPress={() => router.push('/members/')} />
            ) : null}
          </SettingsGroup>
        ) : null}

        <SettingsGroup title={t('profile.support')}>
          <SettingsRow icon="help-circle-outline" label={t('profile.helpFaq')} onPress={() => router.push('/settings/help')} />
          <SettingsRow icon="message-outline" label={t('profile.contactAdmin')} onPress={() => router.push('/settings/contact-admin')} />
        </SettingsGroup>

        <View style={styles.dangerZone}>
          <Button
            label={t('auth.logout')}
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
  statsOuter: { gap: spacing.sm, marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statHalf: { flex: 1 },
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
