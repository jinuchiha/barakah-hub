import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import { layoutTree, flattenTree, buildEdges, type LayoutNode } from '@/lib/tree-layout';
import { TreeNodeComponent } from '@/components/tree/TreeNode';
import { TreeConnector } from '@/components/tree/TreeConnector';
import { useMembers } from '@/hooks/useMembers';
import { GlassCard } from '@/components/ui/GlassCard';

const { width: SW, height: SH } = Dimensions.get('window');

function MemberSheet({ node, onClose }: { node: LayoutNode; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sheet, { backgroundColor: colors.bg2, borderTopColor: colors.border1 }]}>
      <View style={[styles.sheetHandle, { backgroundColor: colors.border2 }]} />
      <View style={styles.sheetContent}>
        <View style={[styles.sheetAvatar, { backgroundColor: `${node.color}30` }]}>
          <Text style={[styles.sheetAvatarText, { color: node.color }]}>
            {node.label.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.sheetName, { color: colors.text1 }]}>{node.label}</Text>
        {node.sublabel ? (
          <Text style={[styles.sheetSub, { color: colors.text3 }]}>{node.sublabel}</Text>
        ) : null}
        {node.deceased ? (
          <Text style={[styles.deceased, { color: colors.text4 }]}>Rahimahullah</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.closeSheet, { backgroundColor: colors.glass3 }]}
        onPress={onClose}
      >
        <MaterialCommunityIcons name="close" size={20} color={colors.text2} />
      </TouchableOpacity>
    </View>
  );
}

export default function FamilyTreeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: members } = useMembers();
  const [selected, setSelected] = useState<LayoutNode | null>(null);
  const [search, setSearch] = useState('');

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedTX = useSharedValue(0);
  const savedTY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTX.value = translateX.value;
      savedTY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedTX.value + e.translationX;
      translateY.value = savedTY.value + e.translationY;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate((e) => {
      scale.value = Math.min(2.5, Math.max(0.4, savedScale.value * e.scale));
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const canvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const treeNodes = useMemo(() => {
    if (!members) return [];
    return members.map((m) => ({
      id: m.id,
      parentId: m.parentId,
      label: m.nameEn,
      sublabel: m.nameUr,
      color: m.color,
      photoUrl: m.photoUrl,
      deceased: m.deceased,
    }));
  }, [members]);

  const { roots, width: treeW, height: treeH } = useMemo(
    () => (treeNodes.length > 0 ? layoutTree(treeNodes) : { roots: [], width: 0, height: 0 }),
    [treeNodes],
  );

  const allNodes = useMemo(() => flattenTree(roots), [roots]);
  const edges = useMemo(() => buildEdges(roots), [roots]);

  const filteredIds = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return new Set(allNodes.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id));
  }, [search, allNodes]);

  const OFFSET_X = SW / 2;
  const OFFSET_Y = 60;
  const canvasW = Math.max(treeW + SW, SW * 2);
  const canvasH = Math.max(treeH + 200, SH * 1.5);

  const resetView = () => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    scale.value = withSpring(1);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text1} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>Family Tree</Text>
        <TouchableOpacity onPress={resetView} style={styles.backBtn}>
          <MaterialCommunityIcons name="fit-to-screen" size={22} color={colors.text2} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}>
        <MaterialCommunityIcons name="magnify" size={18} color={colors.text3} />
        <TextInput
          style={[styles.searchInput, { color: colors.text1 }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search member..."
          placeholderTextColor={colors.text4}
        />
      </View>

      <GestureDetector gesture={composed}>
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <Animated.View style={[{ width: canvasW, height: canvasH }, canvasStyle]}>
            <TreeConnector
              edges={edges}
              width={canvasW}
              height={canvasH}
              offsetX={OFFSET_X}
              offsetY={OFFSET_Y}
            />
            {allNodes.map((node) => (
              <TreeNodeComponent
                key={node.id}
                node={node}
                selected={filteredIds ? filteredIds.has(node.id) : selected?.id === node.id}
                onPress={setSelected}
                offsetX={OFFSET_X}
                offsetY={OFFSET_Y}
              />
            ))}
          </Animated.View>
        </View>
      </GestureDetector>

      {allNodes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.text3 }]}>No family members yet</Text>
        </View>
      ) : null}

      {selected ? (
        <MemberSheet node={selected} onClose={() => setSelected(null)} />
      ) : null}
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
  backBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    margin: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xxl,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 4 },
  empty: { position: 'absolute', bottom: '40%', alignSelf: 'center' },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 1,
    padding: spacing.xl,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, marginBottom: spacing.md },
  sheetContent: { alignItems: 'center', gap: 6 },
  sheetAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetAvatarText: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  sheetName: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  sheetSub: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  deceased: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  closeSheet: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
