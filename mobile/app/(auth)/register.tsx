import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

const schema = z.object({
  name: z.string().min(2, 'Full name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  monthlyPledge: z.coerce.number().int().min(0).optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

const STEPS = ['Personal', 'Financial', 'Security'];

function StepIndicator({ current }: { current: number }) {
  const { colors } = useTheme();

  return (
    <View style={styles.stepRow}>
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                {
                  backgroundColor: i <= current ? colors.primary : colors.bg4,
                  borderColor: i <= current ? colors.primary : colors.border1,
                },
              ]}
            >
              {i < current ? (
                <MaterialCommunityIcons name="check" size={12} color={colors.bg0} />
              ) : (
                <Text style={[styles.stepNum, { color: i <= current ? colors.bg0 : colors.text4 }]}>
                  {i + 1}
                </Text>
              )}
            </View>
            <Text style={[styles.stepLabel, { color: i <= current ? colors.primary : colors.text4 }]}>
              {label}
            </Text>
          </View>
          {i < STEPS.length - 1 ? (
            <View style={[styles.stepLine, { backgroundColor: i < current ? colors.primary : colors.border1 }]} />
          ) : null}
        </React.Fragment>
      ))}
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { monthlyPledge: 1000 },
  });

  const stepFields: Array<Array<keyof FormData>> = [
    ['name', 'phone'],
    ['monthlyPledge'],
    ['email', 'password', 'confirmPassword'],
  ];

  const handleNext = async () => {
    const valid = await trigger(stepFields[step]);
    if (valid) setStep((s) => s + 1);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await register({ email: data.email, password: data.password, name: data.name, phone: data.phone, monthlyPledge: data.monthlyPledge });
      Alert.alert('Registration Submitted', 'Your account is pending admin approval.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg0 }]}>
      <LinearGradient colors={[colors.bg0, colors.bg1]} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.backRow}>
            <TouchableOpacity onPress={() => (step > 0 ? setStep((s) => s - 1) : router.back())} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text1} />
            </TouchableOpacity>
          </View>

          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={[styles.title, { color: colors.text1 }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.text3 }]}>Join the family treasury</Text>
          </Animated.View>

          <Animated.View entering={FadeInRight.duration(400).delay(100)}>
            <StepIndicator current={step} />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(200)} key={step}>
            <GlassCard style={styles.formCard}>
              {step === 0 ? (
                <>
                  <Controller control={control} name="name"
                    render={({ field: { onChange, value } }) => (
                      <Input label="Full Name" value={value ?? ''} onChangeText={onChange} leftIcon="account-outline" autoComplete="name" error={errors.name?.message} />
                    )}
                  />
                  <Controller control={control} name="phone"
                    render={({ field: { onChange, value } }) => (
                      <Input label="Phone Number (optional)" value={value ?? ''} onChangeText={onChange} leftIcon="phone-outline" keyboardType="phone-pad" error={errors.phone?.message} />
                    )}
                  />
                </>
              ) : step === 1 ? (
                <Controller control={control} name="monthlyPledge"
                  render={({ field: { onChange, value } }) => (
                    <Input label="Monthly Pledge (PKR)" value={value?.toString() ?? ''} onChangeText={onChange} leftIcon="cash" keyboardType="numeric" error={errors.monthlyPledge?.message} />
                  )}
                />
              ) : (
                <>
                  <Controller control={control} name="email"
                    render={({ field: { onChange, value } }) => (
                      <Input label="Email Address" value={value ?? ''} onChangeText={onChange} leftIcon="email-outline" keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />
                    )}
                  />
                  <Controller control={control} name="password"
                    render={({ field: { onChange, value } }) => (
                      <Input label="Password" value={value ?? ''} onChangeText={onChange} isPassword leftIcon="lock-outline" error={errors.password?.message} />
                    )}
                  />
                  <Controller control={control} name="confirmPassword"
                    render={({ field: { onChange, value } }) => (
                      <Input label="Confirm Password" value={value ?? ''} onChangeText={onChange} isPassword leftIcon="lock-check-outline" error={errors.confirmPassword?.message} />
                    )}
                  />
                </>
              )}

              <View style={styles.btnRow}>
                {step < 2 ? (
                  <Button label="Next" onPress={handleNext} variant="solid" fullWidth />
                ) : (
                  <Button label="Create Account" onPress={handleSubmit(onSubmit)} loading={loading} variant="solid" fullWidth />
                )}
              </View>
            </GlassCard>
          </Animated.View>

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.loginRow}>
            <Text style={[styles.loginLabel, { color: colors.text3 }]}>Already have an account? </Text>
            <Text style={[styles.loginLink, { color: colors.primary }]}>Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.lg, paddingBottom: 60 },
  backRow: { marginBottom: spacing.md },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4, marginBottom: spacing.lg },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  stepNum: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  stepLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  stepLine: {
    flex: 1,
    height: 1.5,
    marginBottom: 20,
    marginHorizontal: 4,
  },
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  btnRow: {
    marginTop: spacing.sm,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  loginLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  loginLink: { fontSize: 14, fontFamily: 'Inter_700Bold' },
});
