import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, RefreshControl, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMembers } from '@/hooks/useMembers';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import type { Member } from '@/types';

type FilterMode = 'all' | 'admin' | 'member' | 'pending';
const FILTERS: Array<{ value: FilterMode; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Members' },
  { value: 'pending', label: 'Pending' },
];

function MemberCard({ member, isAdmin, onPress }: { member: Member; isAdmin: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={[styles.memberCard, { backgroundColor: colors.bg2, borderColor: colors.border1 }]}
      onPress={onPress}
    >
      <Avatar name={member.nameEn || member.nameUr} color={member.color} size="md" />
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: colors.text1 }]}>{member.nameEn}</Text>
        {member.nameUr ? <Text style={[styles.memberNameUr, { color: colors.text3 }]}>{member.nameUr}</Text> : null}
        {member.city ? (
          <View style={styles.cityRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={12} color={colors.text4} />
            <Text style={[styles.cityText, { color: colors.text4 }]}>{member.city}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.memberRight}>
        {isAdmin ? (
          <Badge
            label={member.status}
            variant={member.status === 'approved' ? 'success' : member.status === 'pending' ? 'warning' : 'danger'}
          />
        ) : null}
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.text4} />
      </View>
    </Pressable>
  );
}

export default function MembersScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchFocused, setSearchFocused] = useState(false);
  const { data, isLoading, refetch, isRefetching } = useMembers();

  const inputWidth = useSharedValue(0);
  const inputOpacity = useSharedValue(0);

  const searchExpandStyle = useAnimatedStyle(() => ({
    width: inputWidth.value,
    opacity: inputOpacity.value,
  }));

  const expandSearch = () => {
    setSearchFocused(true);
    inputWidth.value = withTiming(1, { duration: 250 });
    inputOpacity.value = withTiming(1, { duration: 250 });
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch = !q || m.nameEn.toLowerCase().includes(q) || m.nameUr.includes(q) || (m.city ?? '').toLowerCase().includes(q);
      const matchFilter = filterMode === 'all' || (filterMode === 'admin' ? m.role === 'admin' : filterMode === 'member' ? m.role === 'member' : m.status === 'pending');
      return matchSearch && matchFilter;
    });
  }, [data, search, filterMode]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View style={[styles.searchBar, { backgroundColor: colors.bg2, borderColor: searchFocused ? colors.primary : colors.border1 }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={searchFocused ? colors.primary : colors.text3} />
          <TextInput
            style={[styles.searchInput, { color: colors.text1 }]}
            placeholder="Search members..."
            placeholderTextColor={colors.text4}
            value={search}
            onChangeText={setSearch}
            onFocus={expandSearch}
            onBlur={() => setSearchFocused(false)}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.text4} />
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.filterChip,
              { backgroundColor: filterMode === f.value ? colors.primaryDim : colors.glass2, borderColor: filterMode === f.value ? colors.primary : colors.border1 },
            ]}
            onPress={() => setFilterMode(f.value)}
          >
            <Text style={[styles.filterText, { color: filterMode === f.value ? colors.primary : colors.text3 }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {isLoading ? (
        <EmptyState icon="loading" title="Loading members..." />
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item: Member) => item.id}
          renderItem={({ item }) => (
            <MemberCard
              member={item}
              isAdmin={user?.role === 'admin'}
              onPress={() => router.push(`/members/${item.id}`)}
            />
          )}
          estimatedItemSize={76}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListHeaderComponent={
            <Text style={[styles.count, { color: colors.text4 }]}>{filtered.length} members</Text>
          }
          ListEmptyComponent={
            <EmptyState icon="account-search-outline" title="No members found" subtitle="Try a different search term" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  filterText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  count: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    paddingBottom: spacing.sm,
  },
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: 100 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    gap: spacing.sm,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  memberNameUr: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  cityText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  memberRight: { alignItems: 'flex-end', gap: 4 },
});
