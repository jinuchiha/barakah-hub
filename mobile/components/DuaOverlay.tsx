import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { randomDua, DUA_KIND_LABEL } from '@/lib/duas';
import { haptic } from '@/lib/haptics';

interface DuaOverlayProps {
  visible: boolean;
  onDone: () => void;
}

/**
 * Post-sadqa reward moment — the mobile twin of the web's DuaOverlay.
 * A sourced dua/ayah fades in over a deep-ink veil with a gold bloom;
 * dismiss by tap or the آمين button.
 */
export function DuaOverlay({ visible, onDone }: DuaOverlayProps) {
  const [dua, setDua] = useState(randomDua);
  const veil = useSharedValue(0);
  const card = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setDua(randomDua());
      void haptic.success();
      veil.value = withTiming(1, { duration: 350 });
      card.value = withDelay(200, withSpring(1, { damping: 16, stiffness: 160 }));
    } else {
      veil.value = withTiming(0, { duration: 220 });
      card.value = withTiming(0, { duration: 220 });
    }
  }, [visible, veil, card]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: card.value,
    transform: [{ scale: 0.9 + card.value * 0.1 }, { translateY: (1 - card.value) * 24 }],
  }));

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onDone}>
      <Animated.View style={[styles.veil, veilStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onDone} />
        <Animated.View style={[styles.card, cardStyle]}>
          <LinearGradient
            colors={['#0d1525', '#131e35']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.bloom} pointerEvents="none" />
          <Animated.Text entering={FadeInDown.duration(600).delay(300)} style={styles.ornament}>۞</Animated.Text>
          <Text style={styles.jazak}>جزاك الله خيرا</Text>
          <Text style={styles.arabic}>{dua.arabic}</Text>
          <Text style={styles.urdu}>{dua.urdu}</Text>
          <Text style={styles.source}>{DUA_KIND_LABEL[dua.type].en} · {dua.source}</Text>
          {/* "Ameen" is the response to a supplication. A Qur'anic ayah or a
              hadith is not one — closing those says alhamdulillah instead. */}
          <TouchableOpacity
            style={styles.ameenBtn}
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel={dua.type === 'dua' ? 'Ameen — close' : 'Alhamdulillah — close'}
          >
            <Text style={styles.ameenText}>{dua.type === 'dua' ? 'آمين' : 'اَلْحَمْدُ لِلّٰهِ'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  veil: {
    flex: 1, backgroundColor: 'rgba(4,7,12,0.88)',
    alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  card: {
    width: '100%', maxWidth: 380, borderRadius: 24, padding: 28,
    borderWidth: 1, borderColor: 'rgba(217,176,76,0.35)',
    alignItems: 'center', overflow: 'hidden',
  },
  bloom: {
    position: 'absolute', top: -60, alignSelf: 'center',
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(217,176,76,0.10)',
  },
  ornament: { fontSize: 26, color: '#d9b04c', marginBottom: 10 },
  jazak: {
    fontSize: 15, color: 'rgba(217,176,76,0.85)', marginBottom: 18,
    fontWeight: '600', letterSpacing: 0.5,
  },
  arabic: {
    fontSize: 22, color: '#f2ecd9', textAlign: 'center', lineHeight: 40,
    marginBottom: 14, writingDirection: 'rtl',
  },
  urdu: {
    fontSize: 14, color: 'rgba(236,235,230,0.78)', textAlign: 'center',
    lineHeight: 32, marginBottom: 14, writingDirection: 'rtl',
    fontFamily: 'NotoNastaliqUrdu_400Regular',
  },
  source: {
    fontSize: 11, color: 'rgba(200,155,60,0.7)', letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 22,
  },
  ameenBtn: {
    paddingHorizontal: 36, paddingVertical: 11, borderRadius: 24,
    backgroundColor: 'rgba(217,176,76,0.14)',
    borderWidth: 1, borderColor: 'rgba(217,176,76,0.45)',
  },
  ameenText: { fontSize: 17, color: '#d9b04c', fontWeight: '700' },
});
