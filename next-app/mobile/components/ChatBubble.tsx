import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withRepeat,
  withTiming, FadeInDown,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import type { ChatMessage } from '@/lib/ai';

function TypingDots() {
  const { colors } = useTheme();
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    dot1.value = withRepeat(withTiming(-6, { duration: 400 }), -1, true);
    setTimeout(() => {
      dot2.value = withRepeat(withTiming(-6, { duration: 400 }), -1, true);
    }, 133);
    setTimeout(() => {
      dot3.value = withRepeat(withTiming(-6, { duration: 400 }), -1, true);
    }, 266);
  }, [dot1, dot2, dot3]);

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  return (
    <View style={styles.dots}>
      {[s1, s2, s3].map((s, i) => (
        <Animated.View key={i} style={[styles.dot, { backgroundColor: colors.text3 }, s]} />
      ))}
    </View>
  );
}

interface ChatBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function ChatBubble({ message, isStreaming = false }: ChatBubbleProps) {
  const { colors } = useTheme();
  const isUser = message.role === 'user';
  const isEmpty = !message.content && message.role === 'assistant';
  const scale = useSharedValue(0.92);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 180 });
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bubbleStyle = isUser
    ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
    : { backgroundColor: colors.glass3, borderColor: colors.border2, borderWidth: 1, borderBottomLeftRadius: 4 };

  const textColor = isUser ? '#000' : colors.text1;

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      style={[styles.row, isUser ? styles.rowRight : styles.rowLeft, animStyle]}
    >
      {!isUser ? (
        <View style={[styles.avatar, { backgroundColor: colors.primaryDim }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>B</Text>
        </View>
      ) : null}
      <View style={[styles.bubble, bubbleStyle, { maxWidth: '78%' }]}>
        {isEmpty && isStreaming ? (
          <TypingDots />
        ) : (
          <Text style={[styles.text, { color: textColor }]}>{message.content}</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  avatarText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.xl,
  },
  text: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21 },
  dots: { flexDirection: 'row', gap: 4, paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});
