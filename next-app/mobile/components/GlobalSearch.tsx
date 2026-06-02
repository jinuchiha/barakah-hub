import React, { memo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Keyboard,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/useTheme';
import { useGlobalSearch, type SearchResult } from '@/hooks/useGlobalSearch';
import { spacing, radius } from '@/lib/theme';

const TYPE_ICON: Record<SearchResult['type'], string> = {
  member: 'account-outline',
  payment: 'cash-multiple',
  case: 'alert-circle-outline',
};

const TYPE_COLOR_KEY: Record<SearchResult['type'], string> = {
  member: 'accent',
  payment: 'primary',
  case: 'gold',
};

interface ResultItemProps {
  item: SearchResult;
  onPress: (item: SearchResult) => void;
}

const ResultItem = memo(function ResultItem({ item, onPress }: ResultItemProps) {
  const { colors } = useTheme();
  const colorKey = TYPE_COLOR_KEY[item.type] as keyof typeof colors;
  const color = colors[colorKey] as string;

  return (
    <TouchableOpacity
      style={[styles.result, { borderBottomColor: colors.border1 }]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.resultIcon, { backgroundColor: `${color}20` }]}>
        <MaterialCommunityIcons
          name={TYPE_ICON[item.type] as never}
          size={18}
          color={color}
        />
      </View>
      <View style={styles.resultText}>
        <Text style={[styles.resultTitle, { color: colors.text1 }]}>{item.title}</Text>
        {item.subtitle ? (
          <Text style={[styles.resultSub, { color: colors.text4 }]}>{item.subtitle}</Text>
        ) : null}
      </View>
      <Text style={[styles.typeTag, { color: colors.text4 }]}>{item.type}</Text>
    </TouchableOpacity>
  );
});

interface GlobalSearchProps {
  visible: boolean;
  onClose: () => void;
  onSelectResult?: (result: SearchResult) => void;
}

export const GlobalSearch = memo(function GlobalSearch({
  visible,
  onClose,
  onSelectResult,
}: GlobalSearchProps) {
  const { colors } = useTheme();
  const { query, results, search, clear } = useGlobalSearch();
  const inputRef = useRef<TextInput>(null);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    clear();
    onClose();
  }, [clear, onClose]);

  const handleSelect = useCallback(
    (item: SearchResult) => {
      onSelectResult?.(item);
      handleClose();
    },
    [onSelectResult, handleClose],
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.overlay}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={[styles.container, { backgroundColor: colors.bg1 }]}>
            <View style={[styles.searchBar, { backgroundColor: colors.glass2, borderColor: colors.border2 }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.text3} />
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.text1 }]}
                placeholder="Search members, payments, cases..."
                placeholderTextColor={colors.text4}
                value={query}
                onChangeText={search}
                autoFocus
                returnKeyType="search"
              />
              {query ? (
                <TouchableOpacity onPress={clear}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={colors.text4} />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={(r) => `${r.type}_${r.id}`}
              renderItem={({ item }) => (
                <ResultItem item={item} onPress={handleSelect} />
              )}
              style={[styles.list, { backgroundColor: colors.bg1 }]}
              keyboardShouldPersistTaps="handled"
            />
          ) : query.length > 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.bg1 }]}>
              <MaterialCommunityIcons name="magnify-close" size={40} color={colors.text4} />
              <Text style={[styles.emptyText, { color: colors.text3 }]}>
                No results for "{query}"
              </Text>
            </View>
          ) : (
            <View style={[styles.hint, { backgroundColor: colors.bg1 }]}>
              <Text style={[styles.hintText, { color: colors.text4 }]}>
                Search across members, payments, and cases
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  safe: { flex: 1 },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  cancelBtn: { paddingHorizontal: 4 },
  cancelText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  list: { flex: 1 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: { flex: 1 },
  resultTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  resultSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  typeTag: {
    fontSize: 10,
    fontFamily: 'SpaceMono_400Regular',
    textTransform: 'uppercase',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  hint: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  hintText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});
