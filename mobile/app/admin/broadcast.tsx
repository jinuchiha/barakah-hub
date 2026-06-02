import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { api } from '@/lib/api';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { SuccessOverlay } from '@/components/ui/SuccessOverlay';
import { useAuthStore } from '@/stores/auth.store';
import { isAdminOnly } from '@/lib/roles';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

const schema = z.object({
  subject: z.string().min(1, 'Subject required').max(200),
  body: z.string().min(1, 'Message required').max(5000),
});

type FormData = z.infer<typeof schema>;

async function sendBroadcast(data: FormData): Promise<void> {
  await api.post('/api/admin/broadcast', data);
}

function SuccessView({ onDismiss }: { onDismiss: () => void }) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={ZoomIn.springify()}>
      <GlassCard glowColor={colors.primaryGlow} style={styles.successCard}>
        <View style={[styles.successIcon, { backgroundColor: colors.primaryDim }]}>
          <MaterialCommunityIcons name="check-circle" size={44} color={colors.primary} />
        </View>
        <Text style={[styles.successTitle, { color: colors.text1 }]}>Broadcast Sent!</Text>
        <Text style={[styles.successBody, { color: colors.text3 }]}>
          Your message has been delivered to all approved members.
        </Text>
        <Button label="Send Another" onPress={onDismiss} variant="primary" fullWidth style={styles.sendAnotherBtn} />
      </GlassCard>
    </Animated.View>
  );
}

export default function BroadcastScreen() {
  const { colors } = useTheme();
  const { user, isLoading: authLoading } = useAuthStore();
  const [sent, setSent] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const mutation = useMutation({ mutationFn: sendBroadcast });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    Alert.alert('Send Broadcast', 'This will be sent to ALL members. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          try {
            await mutation.mutateAsync(data);
            setShowSuccess(true);
            setSent(true);
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send broadcast');
          }
        },
      },
    ]);
  };

  if (authLoading) return <LoadingScreen />;
  if (!isAdminOnly(user?.role)) return <Redirect href="/admin" />;

  if (sent) return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['bottom']}>
      <SuccessOverlay visible={showSuccess} type="success" message="Broadcast Sent!" onDone={() => setShowSuccess(false)} />
      <View style={styles.centeredContainer}>
        <SuccessView onDismiss={() => { setSent(false); reset(); }} />
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(400)} style={styles.pageHeader}>
            <View style={[styles.headerIcon, { backgroundColor: '#ea80fc20' }]}>
              <MaterialCommunityIcons name="bullhorn-outline" size={32} color="#ea80fc" />
            </View>
            <View>
              <Text style={[styles.pageTitle, { color: colors.text1 }]}>Broadcast Message</Text>
              <Text style={[styles.pageSub, { color: colors.text3 }]}>Send to all members</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(120)}>
            <GlassCard style={styles.formCard}>
              <Controller control={control} name="subject"
                render={({ field: { onChange, value } }) => (
                  <Input label="Subject" value={value ?? ''} onChangeText={onChange} placeholder="e.g. Monthly reminder" leftIcon="format-title" error={errors.subject?.message} />
                )}
              />
              <Controller control={control} name="body"
                render={({ field: { onChange, value } }) => (
                  <Input label="Message" value={value ?? ''} onChangeText={onChange} multiline numberOfLines={8} placeholder="Type your message..." error={errors.body?.message} />
                )}
              />

              <View style={[styles.warningBox, { backgroundColor: colors.goldDim, borderRadius: radius.sm }]}>
                <MaterialCommunityIcons name="alert-outline" size={16} color={colors.gold} />
                <Text style={[styles.warningText, { color: colors.gold }]}>
                  This notification will be delivered to all approved members immediately.
                </Text>
              </View>

              <Button
                label="Send to All Members"
                onPress={handleSubmit(onSubmit)}
                loading={mutation.isPending}
                variant="solid"
                fullWidth
              />
            </GlassCard>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 40 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  pageSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  formCard: { padding: spacing.lg },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    flex: 1,
    lineHeight: 18,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  successCard: {
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', marginBottom: spacing.sm },
  successBody: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  sendAnotherBtn: { width: '100%' },
});
