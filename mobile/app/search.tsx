import React, { useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGlobalSearch, type SearchResult } from '@/hooks/useGlobalSearch';
import { EmptyState } from '@/components/ui/EmptyState';
import { GlassCard } from '@/components/ui/GlassCard';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

const TYPE_ICON: Record<SearchResult['type'], string> = {
  member: 'account-outline',
  payment: 'cash-multiple',
  case: 'alert-circle-outline',
};

const TYPE_COLOR_KEY: Record<SearchResult['type'], 'primary' | 'gold' | 'accent'> = {
  member: 'accent',
  payment: 'primary',
  case: 'gold',
};

const GROUP_LABELS: Record<SearchResult['type'], string> = {
  member: 'Members',
  payment: 'Payments',
  case: 'Cases',
};

function ResultRow({ item, onPress }: { item: SearchResult; onPress: (r: SearchResult) => void }) {
  const { colors } = useTheme();
  const colorKey = TYPE_COLOR_KEY[item.type];
  const color = colors[colorKey];
  return (
    <TouchableOpacity
      style={[styles.resultRow, { borderBottomColor: colors.border1 }]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.resultIcon, { backgroundColor: `${color}20` }]}>
        <MaterialCommunityIcons name={TYPE_ICON[item.type] as never} size={18} color={color} />
      </View>
      <View style={styles.resultText}>
        <Text style={[styles.resultTitle, { color: colors.text1 }]}>{item.title}</Text>
        {item.subtitle ? (
          <Text style={[styles.resultSub, { color: colors.text4 }]} numberOfLines={1}>{item.subtitle}</Text>
        ) : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={16} color={colors.text4} />
    </TouchableOpacity>
  );
}

function GroupHeader({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.groupHeader, { color: colors.text4, backgroundColor: colors.bg1 }]}>
      {label.toUpperCase()}
    </Text>
  );
}

type ListItem = { _type: 'header'; label: string; key: string } | (SearchResult & { _type: 'result' });

function buildListData(results: SearchResult[]): ListItem[] {
  const groups: Partial<Record<SearchResult['type'], SearchResult[]>> = {};
  for (const r of results) {
    if (!groups[r.type]) groups[r.type] = [];
    groups[r.type]!.push(r);
  }
  const items: ListItem[] = [];
  for (const [type, rows] of Object.entries(groups) as [SearchResult['type'], SearchResult[]][]) {
    items.push({ _type: 'header', label: GROUP_LABELS[type], key: `hdr_${type}` });
    for (const r of rows) items.push({ ...r, _type: 'result' });
  }
  return items;
}

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { query, results, search, clear } = useGlobalSearch();
  const inputRef = useRef<TextInput>(null);

  const handleSelect = useCallback((item: SearchResult) => {
    if (item.type === 'member') {
      router.push(`/members/${item.id}` as never);
    } else if (item.type === 'payment') {
      router.push('/(tabs)/payments' as never);
    } else if (item.type === 'case') {
      router.push('/(tabs)/cases' as never);
    }
  }, [router]);

  const listData = buildListData(results);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header bar */}
      <View style={[styles.header, { borderBottomColor: colors.border1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text1} />
        </TouchableOpacity>
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
            accessibilityLabel="Search members, payments and cases"
            accessibilityRole="search"
          />
          {query ? (
            <TouchableOpacity onPress={clear}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.text4} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {results.length > 0 ? (
          <FlatList
            data={listData}
            keyExtractor={(item) => (item._type === 'header' ? item.key : `${item.type}_${item.id}`)}
            renderItem={({ item }) => {
              if (item._type === 'header') return <GroupHeader label={item.label} />;
              return <ResultRow item={item} onPress={handleSelect} />;
            }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
          />
        ) : query.length > 0 ? (
          <EmptyState icon="magnify-close" title={`No results for "${query}"`} />
        ) : (
          <View style={styles.hintContainer}>
            <GlassCard style={styles.hintCard}>
              <MaterialCommunityIcons name="magnify" size={36} color={colors.text4} style={styles.hintIcon} />
              <Text style={[styles.hintTitle, { color: colors.text2 }]}>Search Barakah Hub</Text>
              <Text style={[styles.hintSub, { color: colors.text4 }]}>
                Find members by name or clan, payments by month, and emergency cases.
              </Text>
            </GlassCard>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
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
  listContent: { paddingBottom: 40 },
  groupHeader: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 6,
  },
  resultRow: {
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
  resultTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  resultSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  hintContainer: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  hintCard: { padding: spacing.xl, alignItems: 'center' },
  hintIcon: { marginBottom: spacing.sm },
  hintTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: spacing.sm },
  hintSub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
});
