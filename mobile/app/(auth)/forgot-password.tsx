import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/lib/useTheme';
import { spacing } from '@/lib/theme';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

type FormData = z.infer<typeof schema>;

function SuccessView({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={ZoomIn.springify()}>
      <GlassCard elevated style={styles.card}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.successCenter}>
          <View style={[styles.successIconCircle, { backgroundColor: colors.primaryDim }]}>
            <MaterialCommunityIcons name="check-circle" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text1 }]}>Check Your Inbox</Text>
          <Text style={[styles.successBody, { color: colors.text3 }]}>
            A password reset link has been sent to your email address.
          </Text>
          <Button label="Back to Login" onPress={onBack} variant="primary" fullWidth style={styles.backBtn} />
        </Animated.View>
      </GlassCard>
    </Animated.View>
  );
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { sendForgotPassword } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await sendForgotPassword(data);
      setSent(true);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg0 }]}>
      <LinearGradient colors={[colors.bg0, colors.bg1]} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text1} />
          </TouchableOpacity>

          {!sent ? (
            <>
              <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
                <View style={[styles.iconBox, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}>
                  <MaterialCommunityIcons name="lock-reset" size={36} color={colors.primary} />
                </View>
                <Text style={[styles.title, { color: colors.text1 }]}>Reset Password</Text>
                <Text style={[styles.subtitle, { color: colors.text3 }]}>
                  Enter your email and we'll send a reset link.
                </Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(500).delay(150)}>
                <GlassCard style={styles.card}>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        label="Email Address"
                        value={value ?? ''}
                        onChangeText={onChange}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        leftIcon="email-outline"
                        error={errors.email?.message}
                      />
                    )}
                  />
                  <Button
                    label="Send Reset Link"
                    onPress={handleSubmit(onSubmit)}
                    loading={loading}
                    variant="solid"
                    fullWidth
                  />
                </GlassCard>
              </Animated.View>
            </>
          ) : (
            <SuccessView onBack={() => router.replace('/(auth)/login')} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  backBtn: {
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: spacing.md,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    padding: spacing.lg,
  },
  successCenter: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  successBody: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
});
