import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, RefreshControl, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  useMessages, useSendToAdmin, useReplyMessage, useMarkMessagesRead, type Message,
} from '@/hooks/useMessages';
import { useAuthStore } from '@/stores/auth.store';
import { isAdminOnly } from '@/lib/roles';
import { formatRelativeTime } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

interface ComposeTarget { toId?: string; name: string; subject: string }

function MessageItem({ msg, onReply }: { msg: Message; onReply: (m: Message) => void }) {
  const { colors } = useTheme();
  const other = msg.incoming ? msg.from : msg.to;
  return (
    <GlassCard style={styles.msgCard}>
      <View style={styles.msgHead}>
        <Avatar name={other?.nameEn ?? 'Admin'} color={other?.color} size="sm" />
        <View style={styles.flex}>
          <Text style={[styles.msgWho, { color: colors.text1 }]}>
            {msg.incoming ? other?.nameEn ?? 'Member' : `To: ${other?.nameEn ?? 'Admin'}`}
          </Text>
          <Text style={[styles.msgTime, { color: colors.text4 }]}>{formatRelativeTime(msg.createdAt)}</Text>
        </View>
        {msg.incoming && !msg.read ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
      </View>
      <Text style={[styles.msgSubject, { color: colors.text1 }]}>{msg.subject}</Text>
      <Text style={[styles.msgBody, { color: colors.text3 }]}>{msg.body}</Text>
      {msg.incoming ? (
        <TouchableOpacity onPress={() => onReply(msg)} style={styles.replyBtn}>
          <MaterialCommunityIcons name="reply" size={14} color={colors.primary} />
          <Text style={[styles.replyText, { color: colors.primary }]}>Reply</Text>
        </TouchableOpacity>
      ) : null}
    </GlassCard>
  );
}

export default function MessagesScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const isAdmin = isAdminOnly(user?.role);
  const { data, isLoading, refetch, isRefetching } = useMessages();
  const toAdmin = useSendToAdmin();
  const reply = useReplyMessage();
  const markRead = useMarkMessagesRead();

  const [compose, setCompose] = useState<ComposeTarget | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Mark received messages read when the inbox opens.
  useEffect(() => {
    if (data?.some((m) => m.incoming && !m.read)) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.length]);

  const openCompose = (target: ComposeTarget) => {
    setSubject(target.subject);
    setBody('');
    setCompose(target);
  };

  const send = async () => {
    if (subject.trim().length < 3 || body.trim().length < 3) {
      Alert.alert('Incomplete', 'Add a subject and message.');
      return;
    }
    try {
      if (compose?.toId) {
        await reply.mutateAsync({ toId: compose.toId, subject: subject.trim(), body: body.trim() });
      } else {
        await toAdmin.mutateAsync({ subject: subject.trim(), body: body.trim() });
      }
      setCompose(null);
      Alert.alert('Sent', 'Your message has been delivered.');
    } catch (err) {
      Alert.alert('Failed', err instanceof Error ? err.message : 'Could not send');
    }
  };

  const sending = toAdmin.isPending || reply.isPending;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Messages' }} />
      {!isAdmin ? (
        <View style={styles.composeBar}>
          <Button label="✉  Message Admin" onPress={() => openCompose({ name: 'Admin', subject: '' })} variant="solid" fullWidth />
        </View>
      ) : null}

      {isLoading ? (
        <EmptyState icon="loading" title="Loading messages..." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {(data ?? []).length === 0 ? (
            <EmptyState icon="message-outline" title="No messages" subtitle={isAdmin ? 'Member messages appear here' : 'Tap “Message Admin” to start'} />
          ) : (
            (data ?? []).map((m) => (
              <MessageItem key={m.id} msg={m} onReply={(msg) => openCompose({ toId: msg.from?.id, name: msg.from?.nameEn ?? 'Member', subject: `Re: ${msg.subject}` })} />
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={compose !== null} transparent animationType="slide" onRequestClose={() => setCompose(null)}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <GlassCard style={styles.sheet}>
            <Text style={[styles.sheetTitle, { color: colors.text1 }]}>
              {compose?.toId ? `Reply to ${compose.name}` : 'Message Admin'}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text1, borderColor: colors.border1, backgroundColor: colors.glass1 }]}
              placeholder="Subject" placeholderTextColor={colors.text4}
              value={subject} onChangeText={setSubject}
            />
            <TextInput
              style={[styles.input, styles.bodyInput, { color: colors.text1, borderColor: colors.border1, backgroundColor: colors.glass1 }]}
              placeholder="Your message..." placeholderTextColor={colors.text4}
              value={body} onChangeText={setBody} multiline
            />
            <View style={styles.sheetBtns}>
              <Button label="Cancel" onPress={() => setCompose(null)} variant="ghost" style={styles.flex} />
              <Button label={sending ? 'Sending…' : 'Send'} onPress={send} loading={sending} variant="solid" style={styles.flex} />
            </View>
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  composeBar: { padding: spacing.md, paddingBottom: spacing.sm },
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: 60 },
  msgCard: { padding: spacing.md, marginBottom: spacing.sm },
  msgHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  msgWho: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  msgTime: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  msgSubject: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  msgBody: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  replyText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  backdrop: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  sheet: { padding: spacing.lg, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: spacing.md },
  input: {
    borderWidth: 1, borderRadius: radius.sm, padding: spacing.md,
    fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: spacing.sm,
  },
  bodyInput: { minHeight: 100, textAlignVertical: 'top' },
  sheetBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
