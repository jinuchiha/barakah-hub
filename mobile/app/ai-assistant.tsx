import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import { useAIChat } from '@/hooks/useAIChat';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import type { ChatMessage } from '@/lib/ai';

const SUGGESTIONS = [
  { key: 'zakat', label: 'What is my Zakat for this month?', icon: 'hand-coin-outline' },
  { key: 'qarz', label: 'How does Qarz-e-Hasana work?', icon: 'handshake-outline' },
  { key: 'contributions', label: 'Explain Sadaqah types', icon: 'heart-outline' },
];

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
      <LinearGradient
        colors={[colors.primaryDim, 'transparent']}
        style={styles.emptyGlow}
      />
      <View style={[styles.emptyIcon, { backgroundColor: colors.primaryDim }]}>
        <MaterialCommunityIcons name="robot-happy-outline" size={40} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text1 }]}>Barakah Assistant</Text>
      <Text style={[styles.emptySubtitle, { color: colors.text3 }]}>
        Ask about Zakat, Sadaqah, Qarz-e-Hasana, or any Islamic finance question.
      </Text>
      <View style={styles.suggestions}>
        {SUGGESTIONS.map((s, i) => (
          <Animated.View key={s.key} entering={FadeInDown.duration(300).delay(i * 80)}>
            <TouchableOpacity
              style={[styles.suggestionBtn, { backgroundColor: colors.glass2, borderColor: colors.border2 }]}
              onPress={() => onSuggestion(s.label)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name={s.icon as never} size={16} color={colors.primary} />
              <Text style={[styles.suggestionText, { color: colors.text2 }]}>{s.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

function MessageList({ messages, isStreaming }: { messages: ChatMessage[]; isStreaming: boolean }) {
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages]);

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <ChatBubble
          message={item}
          isStreaming={isStreaming && index === messages.length - 1}
        />
      )}
      contentContainerStyle={styles.messageList}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
    />
  );
}

export default function AIAssistantScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { messages, isStreaming, error, send, clearHistory } = useAIChat();

  const handleClear = () => {
    Alert.alert('Clear Chat', 'Delete all chat history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearHistory },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text1} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.aiDot, { backgroundColor: isStreaming ? colors.gold : colors.primary }]} />
          <Text style={[styles.headerTitle, { color: colors.text1 }]}>Barakah Assistant</Text>
        </View>
        <TouchableOpacity onPress={handleClear} style={styles.iconBtn}>
          <MaterialCommunityIcons name="delete-outline" size={22} color={colors.text3} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <EmptyState onSuggestion={send} />
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} />
        )}

        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.dangerDim }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : null}

        <ChatInput
          onSend={send}
          disabled={isStreaming}
          placeholder="Ask about Zakat, Sadaqah, loans..."
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  iconBtn: { width: 40, alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  aiDot: { width: 8, height: 8, borderRadius: 4 },
  headerTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  messageList: { padding: spacing.md, paddingBottom: spacing.sm },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: '15%',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: spacing.xs },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  suggestions: { width: '100%', gap: spacing.sm },
  suggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  suggestionText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  errorBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});
