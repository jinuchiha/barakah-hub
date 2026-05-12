import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Minimum 8 characters'),
});

type FormData = z.infer<typeof schema>;

function LogoSection() {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInUp.duration(700).springify()} style={styles.logoSection}>
      <View style={[styles.logoCircle, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}>
        <MaterialCommunityIcons name="star-crescent" size={44} color={colors.primary} />
      </View>
      <Text style={[styles.appName, { color: colors.text1 }]}>Barakah Hub</Text>
      <Text style={[styles.appSubtitle, { color: colors.text4 }]}>FAMILY TREASURY</Text>
    </Animated.View>
  );
}

function FormSection({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await login(data);
      onLoginSuccess();
    } catch (err) {
      Alert.alert('Login Failed', err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(600).delay(200).springify()}>
      <GlassCard elevated style={styles.formCard}>
        <Text style={[styles.greeting, { color: colors.gold }]}>السلام عليكم</Text>
        <Text style={[styles.welcomeText, { color: colors.text1 }]}>Welcome Back</Text>

        <View style={styles.formFields}>
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
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Password"
                value={value ?? ''}
                onChangeText={onChange}
                isPassword
                leftIcon="lock-outline"
                error={errors.password?.message}
              />
            )}
          />
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/forgot-password')}
          style={styles.forgotBtn}
        >
          <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
        </TouchableOpacity>

        <Button
          label="Sign In"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          variant="solid"
          fullWidth
          style={styles.signInBtn}
        />

        <View style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: colors.border1 }]} />
          <Text style={[styles.dividerText, { color: colors.text4 }]}>or</Text>
          <View style={[styles.divider, { backgroundColor: colors.border1 }]} />
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.registerRow}>
          <Text style={[styles.registerLabel, { color: colors.text3 }]}>No account? </Text>
          <Text style={[styles.registerLink, { color: colors.primary }]}>Create Account</Text>
        </TouchableOpacity>
      </GlassCard>
    </Animated.View>
  );
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg0 }]}>
      <LinearGradient
        colors={[colors.bg0, colors.bg1]}
        style={StyleSheet.absoluteFillObject}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LogoSection />
          <FormSection onLoginSuccess={() => router.replace('/(tabs)/')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  logoSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: spacing.md,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  appName: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 3,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  greeting: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginBottom: spacing.lg,
  },
  formFields: {
    gap: 0,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  signInBtn: {
    marginBottom: spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  registerLink: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
});
