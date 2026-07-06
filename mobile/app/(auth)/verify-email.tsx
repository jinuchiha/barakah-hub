import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { sendVerificationOtp, verifyEmailOtp } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';
import { useTranslation } from 'react-i18next';
import { haptic } from '@/lib/haptics';

const RESEND_COOLDOWN = 45;

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState((params.email ?? '').toLowerCase());
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const otpRef = useRef<TextInput>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleVerify = async () => {
    if (!email || otp.length !== 6) {
      Alert.alert(t('common.error'), 'Enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      await verifyEmailOtp(email, otp);
      void haptic.success();
      Alert.alert(t('auth.verifyEmail'), t('auth.verified'), [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err) {
      void haptic.error();
      Alert.alert(t('common.error'), err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert(t('common.error'), 'Enter your email first.');
      return;
    }
    try {
      await sendVerificationOtp(email);
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : 'Could not resend');
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#06090f', '#0a0f1a', '#0d1525']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.content}>
            <Animated.View entering={FadeInDown.duration(500)} style={styles.iconWrap}>
              <MaterialCommunityIcons name="email-check-outline" size={44} color={colors.primary} />
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(500).delay(80)}>
              <Text style={styles.heading}>{t('auth.verifyEmail')}</Text>
              <Text style={[styles.sub, { color: colors.text3 }]}>
                {t('auth.otpSent')}{email ? `\n${email}` : ''}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(500).delay(160)} style={styles.form}>
              {!params.email ? (
                <>
                  <Input
                    label={t('auth.email')}
                    value={email}
                    onChangeText={(v) => setEmail(v.toLowerCase())}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon="email-outline"
                  />
                  <View style={{ height: 12 }} />
                </>
              ) : null}
              <TouchableOpacity activeOpacity={1} onPress={() => otpRef.current?.focus()}>
                <View style={styles.otpRow}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.otpCell,
                        { borderColor: otp.length === i ? colors.primary : 'rgba(200,155,60,0.25)' },
                      ]}
                    >
                      <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
              <TextInput
                ref={otpRef}
                value={otp}
                onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                style={styles.hiddenInput}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(500).delay(240)} style={styles.btnSection}>
              <Button
                label={t('auth.verify')}
                onPress={handleVerify}
                variant="solid"
                size="lg"
                loading={loading}
                fullWidth
              />
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResend}
                disabled={cooldown > 0}
              >
                <Text style={[styles.resendText, { color: cooldown > 0 ? colors.text4 : colors.primary }]}>
                  {t('auth.resendCode')}{cooldown > 0 ? ` (${cooldown}s)` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(auth)/login')}>
                <Text style={[styles.resendText, { color: colors.text3 }]}>{t('auth.signIn')}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06090f' },
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 64 },
  iconWrap: {
    width: 88, height: 88, borderRadius: 24, marginBottom: 20,
    borderWidth: 1.5, borderColor: 'rgba(200,155,60,0.35)',
    backgroundColor: 'rgba(200,155,60,0.08)',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
  },
  heading: {
    fontSize: 26, fontFamily: 'Inter_700Bold', color: '#ecebe6',
    letterSpacing: -0.6, textAlign: 'center',
  },
  sub: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 8, textAlign: 'center', lineHeight: 21 },
  form: { marginTop: 32 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  otpCell: {
    width: 46, height: 56, borderRadius: 12, borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center', justifyContent: 'center',
  },
  otpDigit: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#ecebe6' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  btnSection: { marginTop: 32 },
  resendBtn: { alignSelf: 'center', paddingVertical: 14 },
  backBtn: { alignSelf: 'center', paddingVertical: 4 },
  resendText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
