import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, RefreshControl, Modal, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { BrandedEmptyState } from '@/components/ui/BrandedEmptyState';
import {
  useMessages, useSendToAdmin, useReplyMessage, useMarkMessagesRead, type Message,
} from '@/hooks/useMessages';
import { useMembers } from '@/hooks/useMembers';
import { useAuthStore } from '@/stores/auth.store';
import { isAdminOnly } from '@/lib/roles';
import { formatRelativeTime } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

interface ComposeTarget { toId?: string; name: string; subject: string }

function MessageItem({ msg, onReply }: { msg: Message; onReply: (m: Message) => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
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
          <Text style={[styles.replyText, { color: colors.primary }]}>{t('common.reply')}</Text>
        </TouchableOpacity>
      ) : null}
    </GlassCard>
  );
}

export default function MessagesScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = isAdminOnly(user?.role);
  const { data, isLoading, refetch, isRefetching } = useMessages();
  const { data: members } = useMembers();
  const toAdmin = useSendToAdmin();
  const reply = useReplyMessage();
  const markRead = useMarkMessagesRead();

  const [compose, setCompose] = useState<ComposeTarget | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Mark received messages read when the inbox opens.
  useEffect(() => {
    if (data?.some((m) => m.incoming && !m.read) && !markRead.isPending) {
      markRead.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const openCompose = (target: ComposeTarget) => {
    setSubject(target.subject);
    setBody('');
    setMemberSearch('');
    setSelectedMemberId(target.toId ?? null);
    setCompose(target);
  };

  const openAdminCompose = () => {
    setSubject('');
    setBody('');
    setMemberSearch('');
    setSelectedMemberId(null);
    setCompose({ name: '', subject: '' });
  };

  const approvedMembers = (members ?? []).filter((m) => m.status === 'approved');
  const filteredMembers = memberSearch.trim()
    ? approvedMembers.filter((m) =>
        m.nameEn.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.nameUr?.includes(memberSearch),
      )
    : approvedMembers;

  const send = async () => {
    if (subject.trim().length < 3 || body.trim().length < 3) {
      Alert.alert('Incomplete', 'Add a subject and message.');
      return;
    }
    const toId = compose?.toId ?? (isAdmin ? selectedMemberId ?? undefined : undefined);
    if (isAdmin && !toId) {
      Alert.alert('Incomplete', 'Select a member to message.');
      return;
    }
    try {
      if (toId) {
        await reply.mutateAsync({ toId, subject: subject.trim(), body: body.trim() });
      } else {
        await toAdmin.mutateAsync({ subject: subject.trim(), body: body.trim() });
      }
      setCompose(null);
      Alert.alert(t('messages.sent'), t('messages.sentBody'));
    } catch (err) {
      Alert.alert(t('messages.failed'), err instanceof Error ? err.message : 'Could not send');
    }
  };

  const sending = toAdmin.isPending || reply.isPending;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ title: t('messages.title') }} />
      {!isAdmin ? (
        <View style={styles.composeBar}>
          <Button label={t('messages.messageAdmin')} onPress={() => openCompose({ name: 'Admin', subject: '' })} variant={'solid'} fullWidth />
        </View>
      ) : (
        <View style={styles.composeBar}>
          <Button label={t('messages.newMessage')} onPress={openAdminCompose} variant={'solid'} fullWidth />
        </View>
      )}

      {isLoading ? (
        <EmptyState icon={'loading'} title={t('messages.loading')} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {(data ?? []).length === 0 ? (
            <BrandedEmptyState type="messages" title={t('messages.noMessages')} subtitle={isAdmin ? 'Member messages appear here' : 'Tap Message Admin to start'} />
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
              {compose?.toId
                ? `Reply to ${compose.name}`
                : isAdmin
                  ? selectedMemberId
                    ? `New Message to ${approvedMembers.find((m) => m.id === selectedMemberId)?.nameEn ?? 'Member'}`
                    : 'New Message'
                  : 'Message Admin'}
            </Text>

            {isAdmin && !compose?.toId ? (
              <>
                <TextInput
                  style={[styles.input, { color: colors.text1, borderColor: colors.border1, backgroundColor: colors.glass1 }]}
                  placeholder={t('messages.searchMember')} placeholderTextColor={colors.text4}
                  value={memberSearch} onChangeText={setMemberSearch}
                />
                {!selectedMemberId ? (
                  <FlatList
                    data={filteredMembers}
                    keyExtractor={(m) => m.id}
                    style={styles.memberList}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.memberRow, { borderBottomColor: colors.border1 }]}
                        onPress={() => { setSelectedMemberId(item.id); setMemberSearch(''); }}
                      >
                        <Avatar name={item.nameEn} size="sm" />
                        <Text style={[styles.memberName, { color: colors.text1 }]}>{item.nameEn}</Text>
                      </TouchableOpacity>
                    )}
                  />
                ) : (
                  <TouchableOpacity onPress={() => setSelectedMemberId(null)} style={styles.replyBtn}>
                    <MaterialCommunityIcons name="close-circle-outline" size={14} color={colors.primary} />
                    <Text style={[styles.replyText, { color: colors.primary }]}>Change member</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : null}

            <TextInput
              style={[styles.input, { color: colors.text1, borderColor: colors.border1, backgroundColor: colors.glass1 }]}
              placeholder={t('messages.subjectPlaceholder')} placeholderTextColor={colors.text4}
              value={subject} onChangeText={setSubject}
            />
            <TextInput
              style={[styles.input, styles.bodyInput, { color: colors.text1, borderColor: colors.border1, backgroundColor: colors.glass1 }]}
              placeholder={t('messages.bodyPlaceholder')} placeholderTextColor={colors.text4}
              value={body} onChangeText={setBody} multiline
            />
            <View style={styles.sheetBtns}>
              <Button label={t('common.cancel')} onPress={() => setCompose(null)} variant="ghost" style={styles.flex} />
              <Button label={sending ? t('common.sending') : t('common.send')} onPress={send} loading={sending} variant="solid" style={styles.flex} />
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
  memberList: { maxHeight: 160, marginBottom: spacing.sm },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberName: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});
