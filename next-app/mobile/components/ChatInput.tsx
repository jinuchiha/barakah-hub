import React, { useState, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled = false, placeholder }: ChatInputProps) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const canSend = text.trim().length > 0 && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    const msg = text.trim();
    setText('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(msg);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg2, borderTopColor: colors.border1 }]}>
      <View style={[styles.inputWrap, { backgroundColor: colors.glass2, borderColor: colors.border2 }]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.text1 }]}
          value={text}
          onChangeText={setText}
          placeholder={placeholder ?? 'Ask about Zakat, loans...'}
          placeholderTextColor={colors.text4}
          multiline
          maxLength={1000}
          returnKeyType="default"
          editable={!disabled}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: canSend ? colors.primary : colors.glass3 }]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="send"
            size={18}
            color={canSend ? '#000' : colors.text4}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    borderTopWidth: 1,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    maxHeight: 120,
    paddingVertical: 8,
    lineHeight: 20,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
