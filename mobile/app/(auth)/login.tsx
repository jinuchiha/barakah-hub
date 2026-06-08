import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/lib/useTheme';
import { useTranslation } from 'react-i18next';
import { haptic } from '@/lib/haptics';

/** Geometric crescent + star — unique brand mark */
function BrandMark({ size = 72 }: { size?: number }) {
  const c = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ backgroundColor: 'transparent' }}>
      {/* Outer ring */}
      <Circle cx={c} cy={c} r={c - 3} fill="none" stroke="rgba(200,155,60,0.25)" strokeWidth={1.5} />
      {/* Crescent */}
      <Path
        d={`M ${c},${c * 0.22} A ${c * 0.78} ${c * 0.78} 0 1 1 ${c * 0.44},${c * 1.44} A ${c * 0.55} ${c * 0.55} 0 1 0 ${c},${c * 0.22} Z`}
        fill="#c89b3c"
        opacity={0.9}
      />
      {/* 4-point star */}
      <G transform={`translate(${c * 1.1}, ${c * 0.45})`}>
        <Path d="M0,-5 L1.2,-1.2 L5,0 L1.2,1.2 L0,5 L-1.2,1.2 L-5,0 L-1.2,-1.2 Z" fill="#d9b04c" opacity={0.8} />
      </G>
    </Svg>
  );
}

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || !password) {
      Alert.alert(t('common.error'), 'Please fill in all fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      Alert.alert(t('common.error'), 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await login({ email: emailTrimmed, password });
      router.replace('/(tabs)' as any);
      void haptic.success();
    } catch (err) {
      void haptic.error();
      Alert.alert(t('common.error'), err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Full-bleed deep background */}
      <LinearGradient
        colors={['#06090f', '#0a0f1a', '#0d1525']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />
      {/* Ambient gold glow top-right */}
      <View style={styles.glowTopRight} pointerEvents="none" />
      {/* Ambient gold glow bottom-left */}
      <View style={styles.glowBottomLeft} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* ── Brand section ── */}
            <Animated.View entering={FadeInDown.duration(500)} style={styles.brandSection}>
              <View style={styles.logoWrap}>
                <LinearGradient
                  colors={['rgba(200,155,60,0.22)', 'rgba(200,155,60,0.06)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 24 }]}
                />
                <BrandMark size={72} />
              </View>
              <Text style={styles.appName}>Barakah Hub</Text>
              <Text style={styles.appNameAr}>بَرَكَة ہب</Text>
              <View style={styles.taglinePill}>
                <Text style={styles.taglineText}>Family Treasury</Text>
              </View>
            </Animated.View>

            {/* ── Welcome heading ── */}
            <Animated.View entering={FadeInDown.duration(500).delay(80)} style={styles.headingBlock}>
              <Text style={[styles.greeting, { color: colors.primary }]}>السلام علیکم</Text>
              <Text style={styles.heading}>Welcome back</Text>
              <Text style={[styles.subheading, { color: colors.text3 }]}>
                Sign in to your family fund
              </Text>
            </Animated.View>

            {/* ── Form ── */}
            <Animated.View entering={FadeInDown.duration(500).delay(160)} style={styles.form}>
              <Input
                label={t('auth.email')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="email-outline"
                autoComplete="email"
              />
              <View style={styles.gap} />
              <Input
                label={t('auth.password')}
                value={password}
                onChangeText={setPassword}
                isPassword
                leftIcon="lock-outline"
              />
              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => router.push('/(auth)/forgot-password')}
              >
                <Text style={[styles.forgotText, { color: colors.primary }]}>
                  {t('auth.forgotPassword')}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* ── Sign in button ── */}
            <Animated.View entering={FadeInDown.duration(500).delay(240)} style={styles.btnSection}>
              <Button
                label={loading ? 'Signing in…' : t('auth.signIn')}
                onPress={handleLogin}
                variant="solid"
                size="lg"
                loading={loading}
                fullWidth
              />
            </Animated.View>

            {/* ── Register link ── */}
            <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.text3 }]}>
                {t('auth.noAccount')}{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={[styles.footerLink, { color: colors.primary }]}>
                  {t('auth.register')}
                </Text>
              </TouchableOpacity>
            </Animated.View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06090f' },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 32 },
  glowTopRight: {
    position: 'absolute', top: -80, right: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(200,155,60,0.07)',
  },
  glowBottomLeft: {
    position: 'absolute', bottom: 40, left: -100,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(200,155,60,0.04)',
  },
  // Brand
  brandSection: { alignItems: 'center', paddingTop: 52, paddingBottom: 20 },
  logoWrap: {
    width: 88, height: 88, borderRadius: 24,
    borderWidth: 1.5, borderColor: 'rgba(200,155,60,0.35)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  appName: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#ecebe6', letterSpacing: -0.4 },
  appNameAr: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#c89b3c', marginTop: 3 },
  taglinePill: {
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, backgroundColor: 'rgba(200,155,60,0.10)',
    borderWidth: 1, borderColor: 'rgba(200,155,60,0.20)',
  },
  taglineText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'rgba(200,155,60,0.80)', letterSpacing: 1.2, textTransform: 'uppercase' },
  // Heading
  headingBlock: { paddingBottom: 28 },
  greeting: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  heading: { fontSize: 30, fontFamily: 'Inter_700Bold', color: '#ecebe6', letterSpacing: -0.8, lineHeight: 36 },
  subheading: { fontSize: 15, fontFamily: 'Inter_400Regular', marginTop: 6 },
  // Form
  form: { gap: 0 },
  gap: { height: 12 },
  forgotBtn: { alignSelf: 'flex-end', paddingTop: 10, paddingBottom: 4 },
  forgotText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  // Buttons
  btnSection: { marginTop: 20 },
  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 24 },
  footerText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  footerLink: { fontSize: 14, fontFamily: 'Inter_700Bold' },
});
