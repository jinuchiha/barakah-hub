import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Avatar } from '@/components/ui/Avatar';
import { useTheme } from '@/lib/useTheme';
import { radius } from '@/lib/theme';
import type { LayoutNode } from '@/lib/tree-layout';

const NODE_W = 80;
const NODE_H = 56;

interface TreeNodeProps {
  node: LayoutNode;
  selected: boolean;
  onPress: (node: LayoutNode) => void;
  offsetX: number;
  offsetY: number;
}

export function TreeNodeComponent({ node, selected, onPress, offsetX, offsetY }: TreeNodeProps) {
  const { colors } = useTheme();
  const borderColor = selected ? colors.primary : `${node.color}60`;
  const bg = selected ? colors.primaryDim : colors.glass2;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[
        styles.node,
        {
          left: node.x + offsetX - NODE_W / 2,
          top: node.y + offsetY - NODE_H / 2,
          backgroundColor: bg,
          borderColor,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.inner}
        onPress={() => onPress(node)}
        activeOpacity={0.8}
      >
        <Avatar
          name={node.label}
          color={node.color}
          size={28}
          imageUrl={node.photoUrl ?? undefined}
        />
        <Text style={[styles.name, { color: colors.text1 }]} numberOfLines={1}>
          {node.label.split(' ')[0]}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  node: {
    position: 'absolute',
    width: NODE_W,
    height: NODE_H,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  name: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
});
