import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Surface texture.
 *
 * A flat dark fill reads as cheap — it has no material. A few percent of grain
 * is what separates a considered dark interface from a coloured rectangle, and
 * on the web it is a one-line CSS overlay. React Native has no equivalent, so
 * it ships as a small tiled image.
 *
 * Deliberately NOT Skia: that dependency is present but unused anywhere in the
 * app, and the fund screen is the wrong place to find out whether an untested
 * native path works. A tiled PNG gets the same result with no native surface
 * and less runtime cost.
 */
export function Grain({ opacity = 0.035, style }: { opacity?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }, style]}>
      <Image
        source={require('../../assets/images/noise.png')}
        resizeMode="repeat"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/**
 * A soft radial halo in the brand gold, for sitting behind a hero figure.
 * `expo-linear-gradient` cannot do radial, and a border or card would make the
 * balance look boxed rather than lit, so the falloff is pre-rendered.
 */
export function HeroGlow({
  size = 340,
  opacity = 1,
  style,
}: {
  size?: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View pointerEvents="none" style={[styles.glowWrap, style]}>
      <Image
        source={require('../../assets/images/hero-glow.png')}
        resizeMode="contain"
        style={{ width: size, height: size, opacity }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glowWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
